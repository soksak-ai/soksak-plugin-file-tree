// The files.* commands — driving the tree and opening a file. One for one with the manifest's
// contributes.commands, and exposed to the CLI and to MCP by that declaration alone.
import type { PluginContext } from "./host";
import { resolveTree, resolveTreeKey } from "./treeReg";

// build.mjs injects plugin.json's version. One source for it — a hardcoded copy drifts the day
// the manifest is bumped.
declare const __PLUGIN_VERSION__: string;

/** The viewer this plugin was given, read from its own manifest. null = none was declared. */
function declaredViewer(manifest: unknown): string | null {
  const deps = (manifest as { dependencies?: Record<string, string> } | null)?.dependencies;
  return Object.keys(deps ?? {})[0] ?? null;
}

export function registerCommands(ctx: PluginContext): void {
  const app = ctx.app;
  if (!app.commands) return;
  const sub = (d: { dispose(): void }) => ctx.subscriptions.push(d);

  sub(
    app.commands.register("ping", {
      description: "Files plugin load/version check (E2E).",
      triggers: { ko: "파일 핑 적재확인 버전" },
      returns: "{ ok, version }",
      message: (d) => `The file tree plugin ${d.version} is loaded`,
      handler: () => ({ ok: true, version: __PLUGIN_VERSION__ }),
    }),
  );

  sub(
    app.commands.register("open", {
      description:
        "Open a file as content, through the viewer plugin this one declares as a dependency.",
      triggers: { ko: "파일 열기 보기" },
      params: {
        path: { type: "string", description: "Absolute file path", required: true },
      },
      returns: "{ ok }",
      message: () => "Opened the file",
      // The host held a `ui.intent.open` that opened a path as a file tab. That tab kind is gone —
      // a file reaches the screen as a plugin view like anything else — so opening one is the work
      // of whichever plugin draws files. This names that plugin through `dependencies`, and refuses
      // by name when none is declared rather than answering as though a file had opened.
      handler: async (p) => {
        const viewer = declaredViewer(ctx.manifest);
        if (!viewer) {
          return {
            ok: false,
            code: "TARGET_NOT_FOUND",
            message: "no plugin is declared to open a file — add a viewer to dependencies",
          };
        }
        return await app.commands!.execute(`plugin.${viewer}.open`, {
          path: String(p.path ?? ""),
        });
      },
    }),
  );

  sub(
    app.commands.register("refresh", {
      description: "Re-list the active (or specified) file tree from disk.",
      triggers: { ko: "새로고침 갱신 다시읽기" },
      params: {
        project: { type: "string", description: "Project id (default: active)" },
      },
      returns: "{ ok, project, follow }",
      message: () => "Refreshed the file tree",
      // Offered only while follow is off. With it on the tree already re-lists on every cwd
      // change.
      hint: (d) =>
        d.follow === false && typeof d.project === "string"
          ? [
              {
                cmd: `sok plugin.soksak-plugin-file-tree.follow '{"project":"${d.project}","on":true}'`,
                why: "Turn follow on to refresh on every terminal cwd change",
              },
            ]
          : [],
      handler: (p) => {
        const project = resolveTreeKey(p.project as string | undefined);
        const tree = resolveTree(p.project as string | undefined);
        if (!tree)
          return { ok: false, code: "NO_TARGET", message: "no active file tree" };
        tree.refresh();
        return { ok: true, project, follow: tree.getFollow() };
      },
    }),
  );

  sub(
    app.commands.register("follow", {
      description:
        "Toggle (or set) shell-cwd follow for the active file tree. Off lists the project root.",
      triggers: { ko: "cwd 추종 토글 따라가기 작업디렉토리" },
      params: {
        project: { type: "string", description: "Project id (default: active)" },
        on: { type: "boolean", description: "Explicit on/off (omit to toggle)" },
      },
      returns: "{ ok, follow, project }",
      message: (d) => (d.follow ? "Following the terminal cwd" : "No longer following the terminal cwd"),
      // Offered only just after turning it on: the directory being followed can be seen at once.
      // Turning it off has no follow-up.
      hint: (d) =>
        d.follow === true && typeof d.project === "string"
          ? [
              {
                cmd: `sok plugin.soksak-plugin-file-tree.refresh '{"project":"${d.project}"}'`,
                why: "Refresh now to see the directory being followed",
              },
            ]
          : [],
      handler: (p) => {
        const project = resolveTreeKey(p.project as string | undefined);
        const tree = resolveTree(p.project as string | undefined);
        if (!tree)
          return { ok: false, code: "NO_TARGET", message: "no active file tree" };
        const next = typeof p.on === "boolean" ? p.on : !tree.getFollow();
        tree.setFollow(next);
        return { ok: true, follow: next, project };
      },
    }),
  );
}
