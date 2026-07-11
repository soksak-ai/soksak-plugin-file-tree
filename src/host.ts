// The part of the host API this plugin uses, declared here rather than imported: this is its own
// repository and depends on no core source (A7). A surface whose permission was not declared is
// undefined at runtime.

export interface Disposable {
  dispose(): void;
}

// Same shape as the core's viewRegistry.PluginViewContext. paneId is the terminal pane being
// followed, or null.
export interface PluginViewContext {
  projectId: string;
  root: string | null;
  paneId: string | null;
  setBadge: (badge: number | "dot" | null) => void;
}

export interface PluginViewProvider {
  mount(container: HTMLElement, ctx: PluginViewContext): void;
  unmount?(container: HTMLElement): void;
  // Called instead of a remount when only the followed pane changed, so the same instance stays.
  // Without it every tab switch rebuilds the tree and loses what the view held.
  update?(container: HTMLElement, ctx: PluginViewContext): void;
}

export interface ParamSpec {
  type: string;
  description?: string;
  required?: boolean;
}

// A follow-up worth knowing about — the core's CommandHint. cmd is the line, why is one sentence
// on what it is for. A suggestion and not an instruction: whoever reads it may ignore it.
export interface CommandHint {
  cmd: string;
  why: string;
}

// The caller's context — the core's CommandContext, in the part this plugin reads.
export interface CommandContext {
  pane?: string;
  remote?: boolean;
  window?: { label: string };
  parent?: string;
  origin?: string;
}

export interface PluginCommandSpec {
  description: string;
  triggers?: Record<string, string>;
  params?: Record<string, ParamSpec>;
  returns?: string;
  message?: (data: Record<string, unknown>) => string;
  // Offered on success: what is worth doing next when this command worked. At most three.
  hint?: (data: Record<string, unknown>, ctx: CommandContext) => CommandHint[];
  handler: (params: Record<string, unknown>) => Promise<object> | object;
}

export interface CommandOutcome {
  ok: boolean;
  [k: string]: unknown;
}

export interface Listing {
  root: string;
  children: { name: string; dir: boolean }[];
}

export interface PluginApi {
  pluginId: string;
  locale: () => string;
  commands?: {
    register: (name: string, spec: PluginCommandSpec) => Disposable;
    execute: (
      name: string,
      params?: Record<string, unknown>,
    ) => Promise<CommandOutcome>;
  };
  events: {
    on: (event: string, fn: (payload: unknown) => void) => Disposable;
  };
  ui?: {
    registerView: (viewId: string, provider: PluginViewProvider) => Disposable;
  };
  fs?: {
    list?: (path: string, opts?: { meta?: boolean }) => Promise<unknown>;
    watch?: (dir: string, cb: (dir: string) => void) => Disposable;
  };
  terminal?: {
    getCwd?: (paneId: string) => string | undefined;
    onCwd?: (paneId: string, cb: (cwd: string) => void) => Disposable;
    onCommandFinished?: (paneId: string, cb: () => void) => Disposable;
  };
  data?: {
    kv: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
    };
  };
}

export interface PluginContext {
  app: PluginApi;
  manifest: unknown;
  dir: string;
  subscriptions: Disposable[];
}
