// 파일 탐색기 트리(좌측 사이드바) — 코어 FileTreeSidebar/LazyTree 포팅. lazy 로딩 + OS 워처 증분 reconcile.
// 코어 invoke 대신 공개 API: app.fs.list/watch, app.git.status, app.terminal(cwd 추종), editor.open(파일 열기).
// 테마는 호스트 CSS 변수(계약 A10). cwd 추종은 헤더 토글(기본 프로젝트 루트, 상태는 app.data 영속, S7/S8).
import {
  type CSSProperties,
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

const PH = "​"; // 빈 폴더를 펼침가능으로 만드는 보이지 않는 placeholder(실제 파일과 충돌 불가)
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

// ── lazy 트리 ────────────────────────────────────────────────────────────────

function LazyTree({
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
  // 워처 reconcile(파일 변경) 발생 시 호출 — 상위가 git 데코레이션을 갱신한다(수동 새로고침 불요).
  onFsChange?: () => void;
}) {
  const themeStyles = useMemo(
    () =>
      ({
        ...(themeToTreeStyles(theme) as CSSProperties),
        "--trees-padding-inline-override": "2px",
        "--trees-item-padding-x-override": "2px",
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

  // rel 디렉토리의 자식을 다시 list 해 증분 reconcile(추가/삭제만, 펼침 상태 유지).
  const reconcileRef = useRef<(rel: string) => void>(() => {});

  // OS 워처 등록(폴링 없음) — 변경 시 그 디렉토리만 reconcile. dispose=unwatch.
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

  // reconcileRef: 워처 콜백이 최신 reconcile + 재-list 를 호출. 파일 변경은 git 상태도
  // 바꿀 수 있으므로 데코레이션도 함께 갱신한다(수동 새로고침 불요).
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

  // 최초: 루트 자식 반영.
  useEffect(() => {
    applyChildren("", initialChildren);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 펼침 감지 → 미로드 디렉토리 로드.
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

  // git 데코레이션.
  useEffect(() => {
    model.setGitStatus(gitStatus);
  }, [model, gitStatus]);

  // 언마운트 시 모든 워처 해제.
  useEffect(() => {
    const map = watchers.current;
    return () => {
      for (const d of map.values()) d.dispose();
      map.clear();
    };
  }, []);

  return <FileTree className="ft" style={themeStyles} model={model} />;
}

// ── 사이드바 뷰 ──────────────────────────────────────────────────────────────

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

  // 호스트 테마/언어 추종.
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

  // follow 토글 상태 적재(app.data 영속, 프로젝트별).
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

  // follow 켜짐 + paneId 있으면 그 pane cwd 추종(초기값 + 변경 구독). 꺼지면 미사용.
  useEffect(() => {
    if (!follow || !paneId) {
      setCwd(undefined);
      return;
    }
    setCwd(app.terminal?.getCwd?.(paneId));
    const offCwd = app.terminal?.onCwd?.(paneId, (c) => setCwd(c));
    return () => offCwd?.dispose();
  }, [app, follow, paneId]);

  // git 데코레이션 자동 갱신 — 터미널 명령 완료 시(follow 무관). 수동 새로고침 버튼 불요.
  useEffect(() => {
    if (!paneId) return;
    const offCmd = app.terminal?.onCommandFinished?.(paneId, () =>
      setGitNonce((n) => n + 1),
    );
    return () => offCmd?.dispose();
  }, [app, paneId]);

  const effectiveRoot = (follow ? cwd : undefined) ?? root ?? undefined;

  // 루트 + 직속 자식.
  useEffect(() => {
    if (!effectiveRoot) {
      setListing(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const list = app.fs?.list;
    if (!list) {
      setError("fs:read 권한 없음");
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

  // git 데코.
  useEffect(() => {
    const r = listing?.root;
    if (!r) {
      setGitStatus([]);
      return;
    }
    let cancelled = false;
    void app.git?.status?.(r)
      .then((s) => {
        if (!cancelled) setGitStatus((s as GitStatusEntry[]) ?? []);
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

  // files.refresh/follow 명령이 조작할 수 있도록 이 트리 핸들을 등록(projectId 키).
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
      <div className="sk-files-header" data-node="header">
        <span className="sk-files-title" title={listing?.root}>
          {baseName(listing?.root) ?? "…"}
        </span>
        {paneId && (
          <button
            type="button"
            className={`sk-files-btn${follow ? " on" : ""}`}
            data-node="follow-btn"
            title={translate(follow ? "followOn" : "followOff", lang)}
            onClick={toggleFollow}
          >
            {/* lucide "pin" — 켜짐(추종)=핀 고정 메타포. 우측 호스트 아이콘과 같은 선 스타일/크기. */}
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
            onFsChange={() => setGitNonce((n) => n + 1)}
          />
        ) : (
          <div className="sk-files-msg">{translate("loading", lang)}</div>
        )}
      </div>
    </div>
  );
}
