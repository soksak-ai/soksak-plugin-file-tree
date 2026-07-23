// This plugin's CSS — one <style>, injected once, scoped to .sk-files and inheriting the host's
// variables.
export const GLOBAL_CSS = `
.sk-files {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg, #1e1e1e);
  color: var(--fg, #ddd);
  font: 12px var(--app-font, system-ui, sans-serif);
  overflow: hidden;
}
.sk-files-header {
  flex: none;
  /* The shared second row (core PLUGIN-CONTRACT §Toolbar row). --toolbar-h is the one source for
     its height: the rail and the panels have to read the same token for the horizontal grid to
     line up — measured, a header-row token here sat 5px off the panel toolbar at 28. */
  height: var(--toolbar-h, 28px);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-bottom: 1px solid var(--bd, #333);
}
.sk-files-title {
  flex: 1;
  font-weight: 600;
  color: var(--fg2, #bbb);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sk-files-btn {
  flex: none;
  /* The host's own .icon-btn pattern — a square flex box with the svg centred, which takes the
     glyph baseline out of the arithmetic. */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--fg2, #aaa);
  cursor: pointer;
  border-radius: 4px;
}
.sk-files-btn svg { width: 18px; height: 18px; display: block; }
.sk-files-btn:hover { background: var(--inset, #333); }
.sk-files-btn.on { color: var(--acc, #6cf); }
.sk-files-body { flex: 1; min-height: 0; overflow: auto; padding: 4px 0; }
.sk-files-msg { padding: 12px; color: var(--fg3, #888); font-size: 12px; }
`;
