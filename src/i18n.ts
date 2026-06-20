// This plugin's strings — the text it draws itself, resolved against the host's display language.
type Dict = Record<string, string>;

const EN: Dict = {
  loading: "Loading…",
  refresh: "Refresh",
  followOn: "Follow terminal cwd (on)",
  followOff: "Follow terminal cwd (off — project root)",
  imgFail: "Failed to load image",
  binFail: "Failed to load file",
};

const KO: Dict = {
  loading: "Loading…",
  refresh: "Refresh",
  followOn: "Follow terminal cwd (on)",
  followOff: "Follow terminal cwd (off — project root)",
  imgFail: "The image could not be loaded",
  binFail: "The file could not be loaded",
};

export function t(key: string, lang: string): string {
  const dict = lang === "ko" ? KO : EN;
  return dict[key] ?? EN[key] ?? key;
}
