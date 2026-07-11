// 코어 플러그인 API 중 files 플러그인이 쓰는 표면만 선언(별도 repo — 코어 소스 비의존, A7).
// soksak-plugin-spec v1 의 app.* 와 동형. 미선언 권한 표면은 런타임에 undefined.

export interface Disposable {
  dispose(): void;
}

// 코어 viewRegistry.PluginViewContext 와 동형. paneId = 추종 대상 터미널 pane(cwdPaneOf) 또는 null.
export interface PluginViewContext {
  projectId: string;
  root: string | null;
  paneId: string | null;
  setBadge: (badge: number | "dot" | null) => void;
}

export interface PluginViewProvider {
  mount(container: HTMLElement, ctx: PluginViewContext): void;
  unmount?(container: HTMLElement): void;
  // 라이브 갱신 — 추종 pane(paneId=cwd) 만 바뀔 때 호스트가 remount 대신 호출(같은 인스턴스 재사용).
  // 구현하면 탭 전환마다의 통째 재생성(트리 재구축·뷰 상태 유실)이 사라진다. 미구현이면 호스트가 remount.
  update?(container: HTMLElement, ctx: PluginViewContext): void;
}

export interface ParamSpec {
  type: string;
  description?: string;
  required?: boolean;
}

// 후속 명령 후보(제시) — 코어 CommandHint 와 동형. cmd=제안 명령줄, why=왜 유용한지 한 줄.
// 지시가 아니라 가능성의 제시 — 받은 쪽(사람·AI)이 무시해도, 다른 수를 둬도 된다.
export interface CommandHint {
  cmd: string;
  why: string;
}

// 호출자 컨텍스트 — 코어 CommandContext 와 동형(플러그인이 쓰는 부분만).
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
  // 성공 hint(제시) — 이 명령이 통했을 때 다음에 둘 만한 수를 제시한다(최대 3, 코어가 자른다).
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
