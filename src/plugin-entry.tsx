// This plugin's entry — one ESM the loader imports through a blob URL, bundled by esbuild.
// A tree that stands beside the work (registerView "tree") and a media viewer.
// Code and text go to an editor plugin's viewer; this takes media by exact extension.
import { createRoot, type Root } from "react-dom/client";
import { Tree } from "./tree";
import { MediaViewer, type MediaKind } from "./media";
import { GLOBAL_CSS } from "./styles";
import { registerCommands } from "./commands";
import type {
  FileViewerContext,
  PluginContext,
  PluginViewContext,
} from "./host";

const STYLE_ID = "sk-files-style";

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

const MEDIA: { id: string; kind: MediaKind }[] = [
  { id: "image", kind: "image" },
  { id: "pdf", kind: "pdf" },
  { id: "video", kind: "video" },
  { id: "audio", kind: "audio" },
];

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

    if (app.ui?.registerFileViewer) {
      for (const { id, kind } of MEDIA) {
        ctx.subscriptions.push(
          app.ui.registerFileViewer(id, {
            mount(container: HTMLElement, fctx: FileViewerContext) {
              mountInto(container, <MediaViewer app={app} ctx={fctx} kind={kind} />);
            },
            unmount(container: HTMLElement) {
              unmountContainer(container);
            },
          }),
        );
      }
    }

    registerCommands(ctx);
  },
  deactivate() {
    document.getElementById(STYLE_ID)?.remove();
  },
};
