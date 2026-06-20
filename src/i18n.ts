// file-tree 플러그인 i18n — 사람 UI 텍스트(트리 헤더). 호스트 표시 언어로 해소.
type Dict = Record<string, string>;

const EN: Dict = {
  loading: "Loading…",
  refresh: "Refresh",
  followOn: "Follow terminal cwd (on)",
  followOff: "Follow terminal cwd (off — project root)",
};

const KO: Dict = {
  loading: "불러오는 중…",
  refresh: "새로고침",
  followOn: "터미널 cwd 추종(켜짐)",
  followOff: "터미널 cwd 추종(꺼짐 — 프로젝트 루트)",
};

export function t(key: string, lang: string): string {
  const dict = lang === "ko" ? KO : EN;
  return dict[key] ?? EN[key] ?? key;
}
