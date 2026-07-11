// The file tree that stands beside the work. Loaded lazily and reconciled from the OS watcher.
// Declared surfaces only: app.fs.list/watch, a git plugin's status command for the decorations,
// app.terminal for the cwd it follows, editor.open to open a file.
// Colours come from the host's CSS variables (A10). Whether it follows the terminal is a header
// toggle, kept per project in app.data.
import {
  type CSSProperties,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import {
  themeToTreeStyles,
  type FileTreeBatchOperation,
  type FileTreeDirectoryHandle,
  type GitStatusEntry,
  type TreeThemeInput,
} from "@pierre/trees";
import { t as translate } from "./i18n";
import { setTree, clearTree } from "./treeReg";
import type { Disposable, Listing, PluginApi, PluginViewContext } from "./host";

const PH = "​"; // An invisible child, so an empty folder can still be opened. No real file collides with it.
const EMPTY_PATHS: readonly string[] = [];

const TREE_SCROLLBAR_CSS = `
::-webkit-scrollbar{-webkit-appearance:none;width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(127,127,127,0.22);border-radius:2px}
::-webkit-scrollbar-thumb:hover{background:rgba(127,127,127,0.42)}
::-webkit-scrollbar-corner{background:transparent}
`;

const baseName = (p?: string) =>
  p ? (p.split("/").filter(Boolean).pop() ?? p) : undefined;

function cssVar(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

function detectDark(): boolean {
  const bg = cssVar("--bg", "#1e1e1e");
  const m = bg.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3] < 128;
  if (/^#([0-9a-f]{6})$/i.test(bg)) {
    const r = parseInt(bg.slice(1, 3), 16);
    const g = parseInt(bg.slice(3, 5), 16);
    const b = parseInt(bg.slice(5, 7), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  }
  return true;
}

// ── The lazy tree ───────────────────────────────────────────────────────────

// Memoised: a re-render caused by the followed pane changing stops here when the tree's own
// inputs are the same, so the canvas is rebuilt only when the file data moved. Every prop has to
// be a stable reference for that. Without it the tree was redrawn on every tab switch.
const LazyTree = memo(function LazyTree({
  app,
  rootAbs,
  initialChildren,
  onOpenFile,
  theme,
  gitStatus,
  onFsChange,
}: {
  app: PluginApi;
  rootAbs: string;
  initialChildren: { name: string; dir: boolean }[];
  onOpenFile: (absPath: string) => void;
  theme: TreeThemeInput;
  gitStatus: GitStatusEntry[];
  // Called when the watcher reconciled a change, so the caller can refresh the git decorations
  // without a person pressing anything.
  onFsChange?: () => void;
}) {
  const themeStyles = useMemo(
    () =>
      ({
        ...(themeToTreeStyles(theme) as CSSProperties),
        "--trees-padding-inline-override": "2px",
        "--trees-item-padding-x-override": "2px",
        // The tree's colours are bound to the app's own CSS variables. Through themeToTreeStyles
        // alone the library's built-in light default leaked through — a #f8f8f8 sidebar beside a
        // #f5f5f7 app — because its fallbacks won where the theme said nothing. These are var()
        // references, so a theme change follows without reading or recomputing anything.
        "--trees-bg-override": "var(--bg)",
        "--trees-bg-muted-override": "var(--inset)",
        "--trees-fg-override": "var(--fg)",
        "--trees-fg-muted-override": "var(--fg2)",
        "--trees-accent-override": "var(--acc)",
        "--trees-border-color-override": "var(--bd)",
        "--trees-selected-bg-override": "var(--accbg)",
        "--trees-selected-fg-override": "var(--fg)",
      }) as CSSProperties,
    [theme],
  );

  const loaded = useRef<Set<string>>(new Set());
  const knownDirs = useRef<Set<string>>(new Set());
  const childrenByDir = useRef<Map<string, Set<string>>>(new Map());
  const watchers = useRef<Map<string, Disposable>>(new Map());
  const modelRef = useRef<ReturnType<typeof useFileTree>["model"] | null>(null);
  const rootRef = useRef(rootAbs);
  rootRef.current = rootAbs;
  const openRef = useRef(onOpenFile);
  openRef.current = onOpenFile;
  const appRef = useRef(app);
  appRef.current = app;

  const onSelectionChange = useCallback((selected: readonly string[]) => {
    for (let i = selected.length - 1; i >= 0; i--) {
      const rel = selected[i];
      if (rel.endsWith(PH)) continue;
      const item = modelRef.current?.getItem(rel);
      if (item && !item.isDirectory()) {
        const r = rootRef.current.replace(/\/+$/, "");
        openRef.current(`${r}/${rel}`);
        item.deselect();
        return;
      }
    }
  }, []);

  const options = useMemo(
    () => ({
      paths: EMPTY_PATHS,
      onSelectionChange,
      unsafeCSS: TREE_SCROLLBAR_CSS,
      density: "compact" as const,
      flattenEmptyDirectories: false,
    }),
    [onSelectionChange],
  );
  const { model } = useFileTree(options);
  modelRef.current = model;

  const absOf = useCallback(
    (rel: string) =>
      rel === ""
        ? rootRef.current.replace(/\/+$/, "")
        : `${rootRef.current.replace(/\/+$/, "")}/${rel}`,
    [],
  );

  // Lists one directory again and reconciles what changed — added and removed only, so which
  // folders are open survives it.
  const reconcileRef = useRef<(rel: string) => void>(() => {});

  // The OS watcher, not a poll. A change reconciles that directory alone; disposing unwatches.
  const watchDir = useCallback(
    (rel: string) => {
      if (watchers.current.has(rel)) return;
      const w = appRef.current.fs?.watch;
      if (!w) return;
      const d = w(absOf(rel), () => reconcileRef.current(rel));
      watchers.current.set(rel, d);
    },
    [absOf],
  );

  const applyChildren = useCallback(
    (rel: string, children: { name: string; dir: boolean }[]) => {
      const model = modelRef.current;
      if (!model) return;
      const ops: FileTreeBatchOperation[] = [];
      if (rel !== "" && children.length > 0) {
        ops.push({ type: "remove", path: `${rel}/${PH}` });
      }
      for (const c of children) {
        const p = rel === "" ? c.name : `${rel}/${c.name}`;
        if (c.dir) {
          ops.push({ type: "add", path: `${p}/${PH}` });
          knownDirs.current.add(p);
        } else {
          ops.push({ type: "add", path: p });
        }
      }
      loaded.current.add(rel);
      childrenByDir.current.set(rel, new Set(children.map((c) => c.name)));
      if (ops.length) model.batch(ops);
      watchDir(rel);
    },
    [watchDir],
  );

  const reconcile = useCallback(
    (rel: string, children: { name: string; dir: boolean }[]) => {
      const model = modelRef.current;
      if (!model) return;
      const prev = childrenByDir.current.get(rel);
      if (!prev) {
        applyChildren(rel, children);
        return;
      }
      const next = new Set(children.map((c) => c.name));
      const ops: FileTreeBatchOperation[] = [];
      const wasEmpty = prev.size === 0;
      const nowEmpty = next.size === 0;
      if (rel !== "" && wasEmpty && !nowEmpty) {
        ops.push({ type: "remove", path: `${rel}/${PH}` });
      }
      for (const c of children) {
        if (prev.has(c.name)) continue;
        const p = rel === "" ? c.name : `${rel}/${c.name}`;
        if (c.dir) {
          ops.push({ type: "add", path: `${p}/${PH}` });
          knownDirs.current.add(p);
        } else {
          ops.push({ type: "add", path: p });
        }
      }
      for (const name of prev) {
        if (next.has(name)) continue;
        const p = rel === "" ? name : `${rel}/${name}`;
        ops.push({ type: "remove", path: p });
        const isPrefix = (x: string) => x === p || x.startsWith(`${p}/`);
        for (const s of [...loaded.current]) if (isPrefix(s)) loaded.current.delete(s);
        for (const s of [...knownDirs.current])
          if (isPrefix(s)) knownDirs.current.delete(s);
        for (const k of [...childrenByDir.current.keys()])
          if (isPrefix(k)) childrenByDir.current.delete(k);
        for (const wrel of [...watchers.current.keys()]) {
          if (isPrefix(wrel)) {
            watchers.current.get(wrel)?.dispose();
            watchers.current.delete(wrel);
          }
        }
      }
      if (rel !== "" && !wasEmpty && nowEmpty) {
        ops.push({ type: "add", path: `${rel}/${PH}` });
      }
      childrenByDir.current.set(rel, next);
      if (ops.length) model.batch(ops);
    },
    [applyChildren],
  );

  // The watcher callback reaches the current reconcile through this ref. A file change can move
  // the git status too, so the decorations refresh with it.
  reconcileRef.current = (rel: string) => {
    const list = appRef.current.fs?.list;
    if (!list || !loaded.current.has(rel)) return;
    void list(absOf(rel))
      .then((l) => {
        reconcile(rel, (l as Listing).children);
        onFsChange?.();
      })
      .catch(() => {});
  };

  const loadDir = useCallback(
    (rel: string) => {
      if (loaded.current.has(rel)) return;
      loaded.current.add(rel);
      const list = appRef.current.fs?.list;
      if (!list) return;
      void list(absOf(rel))
        .then((l) => applyChildren(rel, (l as Listing).children))
        .catch(() => {});
    },
    [absOf, applyChildren],
  );

  // First pass: the root's own children.
  useEffect(() => {
    applyChildren("", initialChildren);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A folder was opened: list it if it has not been listed.
  useEffect(() => {
    const handle = () => {
      for (const dir of knownDirs.current) {
        if (loaded.current.has(dir)) continue;
        const item = model.getItem(dir);
        if (item?.isDirectory() && (item as FileTreeDirectoryHandle).isExpanded()) {
          loadDir(dir);
        }
      }
    };
    return model.subscribe(handle);
  }, [model, loadDir]);

  // The git decorations.
  useEffect(() => {
    model.setGitStatus(gitStatus);
  }, [model, gitStatus]);

  // Every watcher released on unmount.
  useEffect(() => {
    const map = watchers.current;
    return () => {
      for (const d of map.values()) d.dispose();
      map.clear();
    };
  }, []);

  return <FileTree className="ft" style={themeStyles} model={model} />;
});

// ── The view ────────────────────────────────────────────────────────────────

export function Tree({ app, ctx }: { app: PluginApi; ctx: PluginViewContext }) {
  const { projectId, root, paneId } = ctx;
  const [lang, setLang] = useState(() => app.locale());
  const [isDark, setIsDark] = useState(detectDark);
  const [follow, setFollow] = useState(false);
  const [cwd, setCwd] = useState<string | undefined>(undefined);
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatusEntry[]>([]);
  const [nonce, setNonce] = useState(0);
  const [gitNonce, setGitNonce] = useState(0);

  // Follows the host's theme and display language.
  useEffect(() => {
    const offTheme = app.events.on("theme.changed", (p) => {
      const mode = (p as { mode?: string })?.mode;
      if (mode === "dark" || mode === "light") setIsDark(mode === "dark");
    });
    const offLocale = app.events.on("locale.changed", (p) => {
      const l = (p as { language?: string })?.language;
      if (typeof l === "string") setLang(l);
    });
    return () => {
      offTheme.dispose();
      offLocale.dispose();
    };
  }, [app]);

  // Whether this project follows the terminal, read back from app.data.
  useEffect(() => {
    let cancelled = false;
    void app.data?.kv
      .get(`follow:${projectId}`)
      .then((v) => {
        if (!cancelled && typeof v === "boolean") setFollow(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [app, projectId]);

  // With follow on and a pane to follow, this tracks that pane's cwd. With it off nothing is
  // subscribed.
  useEffect(() => {
    if (!follow || !paneId) {
      setCwd(undefined);
      return;
    }
    setCwd(app.terminal?.getCwd?.(paneId));
    const offCwd = app.terminal?.onCwd?.(paneId, (c) => setCwd(c));
    return () => offCwd?.dispose();
  }, [app, follow, paneId]);

  // The decorations refresh when a terminal command finishes, whether or not this tree follows
  // that terminal.
  useEffect(() => {
    if (!paneId) return;
    const offCmd = app.terminal?.onCommandFinished?.(paneId, () =>
      setGitNonce((n) => n + 1),
    );
    return () => offCmd?.dispose();
  }, [app, paneId]);

  const effectiveRoot = (follow ? cwd : undefined) ?? root ?? undefined;

  // The root and its immediate children.
  useEffect(() => {
    if (!effectiveRoot) {
      setListing(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const list = app.fs?.list;
    if (!list) {
      setError("no permission to read files");
      return;
    }
    void list(effectiveRoot)
      .then((l) => {
        if (!cancelled) {
          setListing(l as Listing);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [app, effectiveRoot, nonce]);

  // The decorations come from a git plugin's status command.
  // Of what it answers, the tree reads {path, status} alone, and strips the trailing slash an
  // untracked directory carries so the path matches a tree node.
  useEffect(() => {
    const r = listing?.root;
    const exec = app.commands?.execute;
    if (!r || !exec) {
      setGitStatus([]);
      return;
    }
    let cancelled = false;
    void exec("plugin.soksak-plugin-git-core.status", { path: r })
      .then((out) => {
        if (cancelled) return;
        const raw =
          out.ok && out.data && typeof out.data === "object"
            ? ((out.data as { entries?: { path: string; status: string }[] }).entries ?? [])
            : [];
        setGitStatus(
          raw.map((e) => ({
            path: String(e.path).replace(/\/+$/, ""),
            status: e.status,
          })) as GitStatusEntry[],
        );
      })
      .catch(() => {
        if (!cancelled) setGitStatus([]);
      });
    return () => {
      cancelled = true;
    };
  }, [app, listing?.root, nonce, gitNonce]);

  const theme = useMemo<TreeThemeInput>(
    () => ({
      type: isDark ? "dark" : "light",
      bg: cssVar("--bg", isDark ? "#1e1e1e" : "#ffffff"),
      fg: cssVar("--text", isDark ? "#dddddd" : "#222222"),
    }),
    [isDark],
  );

  const onOpenFile = useCallback(
    (absPath: string) => {
      void app.commands?.execute("editor.open", { path: absPath });
    },
    [app],
  );
  // A stable reference, or LazyTree's memo never holds: written inline this is a new function
  // every render.
  const onFsChange = useCallback(() => setGitNonce((n) => n + 1), []);

  const followRef = useRef(follow);
  followRef.current = follow;
  const setFollowPersist = useCallback(
    (on: boolean) => {
      setFollow(on);
      void app.data?.kv.set(`follow:${projectId}`, on).catch(() => {});
    },
    [app, projectId],
  );
  const toggleFollow = useCallback(
    () => setFollowPersist(!followRef.current),
    [setFollowPersist],
  );

  // Registered by project id, so files.refresh and files.follow can act on this tree.
  useEffect(() => {
    setTree(projectId, {
      refresh: () => setNonce((n) => n + 1),
      setFollow: (on) => setFollowPersist(on),
      getFollow: () => followRef.current,
    });
    return () => clearTree(projectId);
  }, [projectId, setFollowPersist]);

  return (
    <div className="sk-files">
      <div className="sk-files-header">
        <span className="sk-files-title" title={listing?.root}>
          {baseName(listing?.root) ?? "…"}
        </span>
        {paneId && (
          <button
            type="button"
            className={`sk-files-btn${follow ? " on" : ""}`}
            data-node="follow"
            title={translate(follow ? "followOn" : "followOff", lang)}
            onClick={toggleFollow}
          >
            {/* lucide "pin" — following is pinned to something. Same stroke and size as the host's
                own icons. */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
          </button>
        )}
      </div>
      <div className="sk-files-body">
        {error ? (
          <div className="sk-files-msg">{error}</div>
        ) : listing ? (
          <LazyTree
            key={listing.root}
            app={app}
            rootAbs={listing.root}
            initialChildren={listing.children}
            onOpenFile={onOpenFile}
            theme={theme}
            gitStatus={gitStatus}
            onFsChange={onFsChange}
          />
        ) : (
          <div className="sk-files-msg">{translate("loading", lang)}</div>
        )}
      </div>
    </div>
  );
}
