// files 플러그인 전역 CSS — 단일 <style> 1회 주입. .sk-files / .sk-fmedia 스코프, 호스트 CSS 변수 상속.
export const GLOBAL_CSS = `
.sk-files {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg, #1e1e1e);
  color: var(--text, #ddd);
  font: 12px var(--font-ui, system-ui, sans-serif);
  overflow: hidden;
}
.sk-files-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border, #333);
}
.sk-files-title {
  flex: 1;
  font-weight: 600;
  color: var(--text-2, #bbb);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sk-files-btn {
  flex: none;
  border: none;
  background: transparent;
  color: var(--text-2, #aaa);
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
  line-height: 1;
}
.sk-files-btn:hover { background: var(--surface-2, #333); }
.sk-files-btn.on { color: var(--accent, #6cf); }
.sk-files-body { flex: 1; min-height: 0; overflow: auto; }
.sk-files-msg { padding: 12px; color: var(--text-3, #888); font-size: 12px; }

.sk-fmedia {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 16px;
  background: var(--bg, #1e1e1e);
  color: var(--text-2, #bbb);
}
.sk-fmedia-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.sk-fmedia-embed, .sk-fmedia-video { width: 100%; height: 100%; border: 0; }
.sk-fmedia-msg { color: var(--text-3, #888); font-size: 13px; }
`;
