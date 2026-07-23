// 2행 공동 그리드 계약(코어 PLUGIN-CONTRACT §Toolbar row) — 사이드바의 보조 상단 행도
// 패널 툴바와 같은 토큰(--toolbar-h)을 소비한다. 행 높이 재창조·타 토큰 소비 금지.
import { describe, expect, it } from "vitest";
import { GLOBAL_CSS } from "./styles";

describe("toolbar row contract", () => {
  it("sk-files-header 는 --toolbar-h 를 소비한다", () => {
    const bar = GLOBAL_CSS.match(/\.sk-files-header \{[^}]*\}/)?.[0] ?? "";
    expect(bar).toMatch(/height:\s*var\(--toolbar-h/);
    expect(bar).not.toMatch(/--header-h/);
  });
});
