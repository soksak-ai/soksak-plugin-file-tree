// This plugin's strings.
//
// A plugin owns its own translations. The host translates the host's surfaces, and a plugin that
// borrowed the host's table would break the first time the host renamed a key it never promised.
//
// Two kinds of reader, two ways out. Text this plugin draws itself — a tree header, a button title
// — is resolved here against the display language the host hands over. Text the host draws — a
// command's description, the answer a command gives — is handed over unresolved, because the host
// is the only one that knows who asked: a `sok` caller reading English through a Korean window is
// answered in English only if the host does the resolving.
type Sentence = { en: string; ko: string };

const MESSAGES = {
  loading: { en: "Loading…", ko: "불러오는 중…" },
  refresh: { en: "Refresh", ko: "새로고침" },
  followOn: { en: "Follow terminal cwd (on)", ko: "터미널 cwd 추종(켜짐)" },
  followOff: {
    en: "Follow terminal cwd (off — project root)",
    ko: "터미널 cwd 추종(꺼짐 — 프로젝트 루트)",
  },

  noReadPermission: { en: "No permission to read files", ko: "파일을 읽을 권한이 없습니다" },

  "cmd.ping.desc": {
    en: "Answer with this plugin's version, to show it is loaded and reachable.",
    ko: "이 플러그인이 적재되어 닿을 수 있음을 보이려고 버전을 답합니다.",
  },
  "cmd.ping.answer": {
    en: "The file tree plugin {version} is loaded",
    ko: "파일 트리 플러그인 {version} 적재됨",
  },
  "cmd.open.desc": {
    en: "Open a file in a tab, through whichever plugin declared it draws that kind of file.",
    ko: "그 종류의 파일을 그린다고 선언한 플러그인을 통해 파일을 탭으로 엽니다.",
  },
  "cmd.open.answer": { en: "Opened the file", ko: "파일을 열었습니다" },
  "cmd.open.noViewer": {
    en: "no plugin is declared to open a file — add a viewer to dependencies",
    ko: "파일을 여는 플러그인이 선언되어 있지 않습니다 — dependencies 에 뷰어를 추가하십시오",
  },
  "cmd.refresh.desc": {
    en: "Read the directory again and redraw the tree.",
    ko: "디렉터리를 다시 읽어 트리를 다시 그립니다.",
  },
  "cmd.refresh.answer": { en: "Refreshed the file tree", ko: "파일 트리를 새로고침했습니다" },
  "cmd.refresh.hint": {
    en: "Turn follow on to refresh on every terminal cwd change",
    ko: "터미널 cwd 변경마다 자동으로 새로고침하려면 follow 를 켤 수 있습니다",
  },
  "cmd.follow.desc": {
    en: "Follow the terminal's working directory, or stop following it and stand at the workspace root.",
    ko: "터미널의 작업 디렉터리를 따라가거나, 따라가기를 멈추고 워크스페이스 루트에 섭니다.",
  },
  "cmd.follow.on": { en: "Following the terminal cwd", ko: "cwd 추종을 켰습니다" },
  "cmd.follow.off": { en: "No longer following the terminal cwd", ko: "cwd 추종을 껐습니다" },
} as const;

export type MessageKey = keyof typeof MESSAGES;

/** Resolved here, for text this plugin draws itself. */
export function t(key: MessageKey, lang: string): string {
  const entry = MESSAGES[key];
  return lang.startsWith("ko") ? entry.ko : entry.en;
}

/**
 * The sentence itself, unresolved, for text the host draws.
 *
 * A command's description is registered once and read by every caller after; resolving it here
 * would freeze it to the language this plugin was registered in, which never changes again.
 */
export function sentence(key: MessageKey): Sentence {
  return MESSAGES[key];
}
