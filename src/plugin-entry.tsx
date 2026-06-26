// This plugin's entry — one ESM the loader imports through a blob URL, bundled by esbuild.
// It owns a file tree that stands beside the work (registerView "tree"). Opening a file is
// a file is delegated to whichever plugin draws that kind of file.
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
          // Only the followed pane changed, so this re-renders into the same root: React
          // reconciles, the cwd effect runs again, and the tree data stays unless the cwd really
          // moved. A remount rebuilt all of it — measured at about 36ms every tab switch.
          update(container: HTMLElement, vctx: PluginViewContext) {
            const root = roots.get(container);
            if (root) root.render(<Tree app={app} ctx={vctx} />);
            else mountInto(container, <Tree app={app} ctx={vctx} />);
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
