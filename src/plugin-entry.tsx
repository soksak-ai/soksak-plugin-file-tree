// soksak file-tree 플러그인 엔트리 — loader 가 blob-URL 로 import 하는 단일 ESM(esbuild 번들).
// 좌측 사이드바 파일 탐색기 트리(registerView "tree"). 파일 열기는 코어 editor.open 으로 위임 —
// 렌더는 등록된 뷰어(에디터/미디어 뷰어) 몫. 이 플러그인은 트리만 소유.
import { createRoot, type Root } from "react-dom/client";
import { Tree } from "./tree";
import { GLOBAL_CSS } from "./styles";
import { registerCommands } from "./commands";
import type { PluginContext, PluginViewContext } from "./host";

const STYLE_ID = "sk-file-tree-style";

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

const roots = new WeakMap<HTMLElement, Root>();

function mountInto(container: HTMLElement, node: React.ReactElement): void {
  ensureStyle();
  unmountContainer(container);
  container.style.position = "relative";
  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.inset = "0";
  container.appendChild(host);
  const root = createRoot(host);
  root.render(node);
  roots.set(container, root);
}

function unmountContainer(container: HTMLElement): void {
  const root = roots.get(container);
  if (root) {
    root.unmount();
    roots.delete(container);
  }
  container.replaceChildren();
}

export default {
  activate(ctx: PluginContext) {
    const app = ctx.app;
    ensureStyle();

    if (app.ui?.registerView) {
      ctx.subscriptions.push(
        app.ui.registerView("tree", {
          mount(container: HTMLElement, vctx: PluginViewContext) {
            mountInto(container, <Tree app={app} ctx={vctx} />);
          },
          unmount(container: HTMLElement) {
            unmountContainer(container);
          },
        }),
      );
    }

    registerCommands(ctx);
  },
  deactivate() {
    document.getElementById(STYLE_ID)?.remove();
  },
};
