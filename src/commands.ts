// files.* 명령 — 트리 조작/파일 열기. 매니페스트 contributes.commands 와 1:1. CLI/MCP 자동 노출.
import type { PluginContext } from "./host";
import { resolveTree, resolveTreeKey } from "./treeReg";

export function registerCommands(ctx: PluginContext): void {
  const app = ctx.app;
  if (!app.commands) return;
  const sub = (d: { dispose(): void }) => ctx.subscriptions.push(d);

  sub(
    app.commands.register("ping", {
      description: "Files plugin load/version check (E2E).",
      triggers: { ko: "파일 핑 적재확인 버전" },
      returns: "{ ok, version }",
      message: (d) => `파일 트리 플러그인 버전 ${d.version} 적재됨`,
      handler: () => ({ ok: true, version: "0.1.0" }),
    }),
  );

  sub(
    app.commands.register("open", {
      description:
        "Open a file as content. Routes through the core editor.open command to the registered viewer.",
      triggers: { ko: "파일 열기 보기" },
      params: {
        path: { type: "string", description: "Absolute file path", required: true },
      },
      returns: "{ ok }",
      message: () => "파일을 열었습니다.",
      handler: async (p) => {
        const r = await app.commands!.execute("editor.open", {
          path: String(p.path ?? ""),
        });
        return { ...r };
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
      message: () => "파일 트리를 새로고침했습니다.",
      // follow 가 꺼져있을 때만 제시 — 켜져있으면 이미 cwd 변경마다 자동 갱신 중이라 불필요.
      hint: (d) =>
        d.follow === false && typeof d.project === "string"
          ? [
              {
                cmd: `sok plugin.soksak-plugin-file-tree.follow '{"project":"${d.project}","on":true}'`,
                why: "터미널 cwd 변경마다 자동으로 새로고침하려면 follow 를 켤 수 있습니다.",
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
      message: (d) => (d.follow ? "cwd 추종을 켰습니다." : "cwd 추종을 껐습니다."),
      // 켬 직후에만 제시 — 지금 바로 추종 중인 디렉토리를 확인할 수 있다. 끔은 후속이 없다.
      hint: (d) =>
        d.follow === true && typeof d.project === "string"
          ? [
              {
                cmd: `sok plugin.soksak-plugin-file-tree.refresh '{"project":"${d.project}"}'`,
                why: "지금 새로고침하면 추종 중인 디렉토리를 바로 확인할 수 있습니다.",
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
