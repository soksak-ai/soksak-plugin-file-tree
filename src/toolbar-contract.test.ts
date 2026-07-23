// The shared second row (core PLUGIN-CONTRACT §Toolbar row). A sidebar's upper row reads the same
// token as a panel toolbar, --toolbar-h. Reinventing the height is what put it 5px off.
import { describe, expect, it } from "vitest";
import { GLOBAL_CSS } from "./styles";

describe("toolbar row contract", () => {
  it("the header row reads --toolbar-h and nothing else", () => {
    const bar = GLOBAL_CSS.match(/\.sk-files-header \{[^}]*\}/)?.[0] ?? "";
    expect(bar).toMatch(/height:\s*var\(--toolbar-h/);
    expect(bar).not.toMatch(/--header-h/);
  });
});
