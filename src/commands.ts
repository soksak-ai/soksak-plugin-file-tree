// The files.* commands — driving the tree and opening a file. One for one with the manifest's
// contributes.commands, and exposed to the CLI and to MCP by that declaration alone.
import type { PluginContext } from "./host";
import { sentence } from "./i18n";
import { resolveTree, resolveTreeKey } from "./treeReg";
import { runtimePluginReferences } from "./runtimeDependencies";

// build.mjs injects plugin.json's version. One source for it — a hardcoded copy drifts the day the
// manifest is bumped and nothing says which of the two is the version.
declare const __PLUGIN_VERSION__: string;

/** The viewer this plugin was given through runtimeDependencies.plugins. null = none was declared. */
export function declaredViewer(manifest: unknown): string | null {
  return runtimePluginReferences(manifest).find((dependency) => !dependency.id.includes("git"))?.id ?? null;
}

export function registerCommands(ctx: PluginContext): void {
  const app = ctx.app;
  if (!app.commands) return;
  const sub = (d: { dispose(): void }) => ctx.subscriptions.push(d);

  sub(
    app.commands.register("ping", {
      description: sentence("cmd.ping.desc"),
      triggers: { ko: "파일 핑 적재확인 버전" },
      returns: "{ ok, version }",
      message: (d) => {
        const said = sentence("cmd.ping.answer");
        const version = String(d.version ?? "");
        return {
          en: said.en.replace("{version}", version),
          ko: said.ko.replace("{version}", version),
        };
      },
      handler: () => ({ ok: true, version: __PLUGIN_VERSION__ }),
    }),
  );

  sub(
    app.commands.register("open", {
      description: sentence("cmd.open.desc"),
      triggers: { ko: "파일 열기 보기" },
      params: {
        path: {
          type: "string",
          description: { en: "Absolute file path", ko: "절대 파일 경로" },
          required: true,
        },
      },
      returns: "{ ok }",
      message: () => sentence("cmd.open.answer"),
      // The host held a `ui.intent.open` that opened a path as a file tab. That tab kind is gone —
      // a file reaches the screen as a plugin view like anything else — so opening one is the work
      // of whichever plugin draws files. This names that plugin through `runtimeDependencies`, and refuses
      // by name when none is declared rather than answering as though a file had opened.
      handler: async (p) => {
        const viewer = declaredViewer(ctx.manifest);
        if (!viewer) {
          return {
            ok: false,
            code: "TARGET_NOT_FOUND",
            message: sentence("cmd.open.noViewer"),
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
      description: sentence("cmd.refresh.desc"),
      triggers: { ko: "새로고침 갱신 다시읽기" },
      params: {
        project: {
          type: "string",
          description: { en: "Project id (default: active)", ko: "프로젝트 id (기본: 활성)" },
        },
      },
      returns: "{ ok, project, follow }",
      message: () => sentence("cmd.refresh.answer"),
      // Offered only while follow is off. With it on the tree already re-lists on every cwd change,
      // so suggesting it would be suggesting what is already happening.
      hint: (d) =>
        d.follow === false && typeof d.project === "string"
          ? [
              {
                cmd: `sok plugin.soksak-plugin-file-tree.follow '{"project":"${d.project}","on":true}'`,
                why: sentence("cmd.refresh.hint"),
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
      description: sentence("cmd.follow.desc"),
      triggers: { ko: "cwd 추종 토글 따라가기 작업디렉토리" },
      params: {
        project: {
          type: "string",
          description: { en: "Project id (default: active)", ko: "프로젝트 id (기본: 활성)" },
        },
        on: {
          type: "boolean",
          description: {
            en: "Explicit on/off (omit to toggle)",
            ko: "켬/끔을 직접 지정 (생략하면 뒤집습니다)",
          },
        },
      },
      returns: "{ ok, follow, project }",
      message: (d) => sentence(d.follow ? "cmd.follow.on" : "cmd.follow.off"),
      // Offered only just after turning it on: the directory being followed can be seen at once.
      // Turning it off has no follow-up.
      hint: (d) =>
        d.follow === true && typeof d.project === "string"
          ? [
              {
                cmd: `sok plugin.soksak-plugin-file-tree.refresh '{"project":"${d.project}"}'`,
                why: sentence("cmd.refresh.answer"),
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
