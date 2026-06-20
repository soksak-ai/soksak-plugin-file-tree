// files.* 명령 — 트리 조작/파일 열기. 매니페스트 contributes.commands 와 1:1. CLI/MCP 자동 노출.
import type { PluginContext } from "./host";
import { resolveTree } from "./treeReg";

export function registerCommands(ctx: PluginContext): void {
  const app = ctx.app;
  if (!app.commands) return;
  const sub = (d: { dispose(): void }) => ctx.subscriptions.push(d);

  sub(
    app.commands.register("ping", {
      description: "Files plugin load/version check (E2E).",
      triggers: { ko: "파일 핑 적재확인 버전" },
      returns: "{ ok, version }",
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
      returns: "{ ok }",
      handler: (p) => {
        const tree = resolveTree(p.project as string | undefined);
        if (!tree) return { ok: false, error: "no active file tree" };
        tree.refresh();
        return { ok: true };
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
      returns: "{ ok, follow }",
      handler: (p) => {
        const tree = resolveTree(p.project as string | undefined);
        if (!tree) return { ok: false, error: "no active file tree" };
        const next = typeof p.on === "boolean" ? p.on : !tree.getFollow();
        tree.setFollow(next);
        return { ok: true, follow: next };
      },
    }),
  );
}
