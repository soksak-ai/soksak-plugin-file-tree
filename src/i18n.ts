// This plugin's strings — the text it draws itself, resolved against the host's display language.
type Dict = Record<string, string>;

const EN: Dict = {
  loading: "Loading…",
  refresh: "Refresh",
  followOn: "Follow terminal cwd (on)",
  followOff: "Follow terminal cwd (off — project root)",
};

const KO: Dict = {
  loading: "Loading…",
  refresh: "Refresh",
  followOn: "Follow terminal cwd (on)",
  followOff: "Follow terminal cwd (off — project root)",
};

export function t(key: string, lang: string): string {
  const dict = lang === "ko" ? KO : EN;
  return dict[key] ?? EN[key] ?? key;
}
