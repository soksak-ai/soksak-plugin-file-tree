import { describe, expect, it } from "vitest";
import { declaredViewer } from "./commands";
import { gitProvider } from "./git";

const manifest = {
  runtimeDependencies: {
    plugins: [
      { id: "soksak-plugin-file-viewer", version: "1.2.3" },
      { id: "soksak-plugin-git", version: "2.3.4" },
    ],
  },
};

describe("manifest runtime dependency selection", () => {
  it("selects providers only from runtimeDependencies.plugins", () => {
    expect(declaredViewer(manifest)).toBe("soksak-plugin-file-viewer");
    expect(gitProvider(manifest)).toBe("soksak-plugin-git");
  });

  it("does not accept the removed dependencies field", () => {
    const legacy = { dependencies: { "soksak-plugin-file-viewer": "1.2.3" } };
    expect(declaredViewer(legacy)).toBeNull();
    expect(gitProvider(legacy)).toBeNull();
  });
});
