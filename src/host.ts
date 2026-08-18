// The part of the host API this plugin uses, declared here rather than imported: this is its own
// repository and it depends on no core source (A7). Same shape as soksak-plugin-spec v1's app.*; a
// surface whose permission was not declared is undefined at runtime.

export interface Disposable {
  dispose(): void;
}

// Same shape as the core's viewRegistry.PluginViewContext. paneId is the terminal pane being
// followed (cwdPaneOf), or null.
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

/** Text a person reads: one string standing for every language, or a language map the host resolves
 *  against whoever asked. Same shape as the host's LocalizedText. */
export type Text = string | Record<string, string>;

export interface ParamSpec {
  type: string;
  description?: Text;
  required?: boolean;
}

// A follow-up worth knowing about — same shape as the core's CommandHint. cmd is the line, why is
// one sentence on what it is for. A suggestion and not an instruction: whoever reads it, person or
// agent, may ignore it or do something else.
export interface CommandHint {
  cmd: string;
  why: Text;
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
  // Read by a person in the palette and in `sok` help, and by an agent discovering the command.
  // Handed over unresolved: the host is the only one that knows who asked, and this is registered
  // once and read by every caller after.
  description: Text;
  triggers?: Record<string, string>;
  params?: Record<string, ParamSpec>;
  returns?: string;
  message?: (data: Record<string, unknown>) => Text;
  // Offered on success: what is worth doing next when this command worked. At most three — the
  // core takes the first of them.
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
