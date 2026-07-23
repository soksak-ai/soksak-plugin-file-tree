// file-tree 플러그인 전역 CSS — 단일 <style> 1회 주입. .sk-files 스코프, 호스트 CSS 변수 상속.
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
  /* 2행 공동 그리드(코어 PLUGIN-CONTRACT §Toolbar row) — 2행 높이의 단일 진실은
     --toolbar-h 다. 레일·패널이 공동사용해야 수평 그리드가 이어진다(과거 헤더행 토큰 소비는
     패널 툴바(28)와 5px 어긋나던 실측 결함). */
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
  /* 우측 호스트 .icon-btn 과 동일 패턴 — flex 정사각 박스 + svg 중앙정렬(글리프 baseline 문제 제거). */
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
