// Git decoration uses the plugin reference declared by this plugin's manifest.
import { describe, expect, it } from "vitest";
import { gitDecorations, gitProvider } from "./git";

const PROVIDER = "soksak-plugin-any-git";

function host({
  entries = [] as { path: string; status: string }[],
  calls = [] as { name: string; params?: Record<string, unknown> }[],
} = {}) {
  const exec = async (name: string, params?: Record<string, unknown>) => {
    calls.push({ name, params });
    if (name === `plugin.${PROVIDER}.status`) return { ok: true, data: { entries } };
    return { ok: true, data: {} };
  };
  return { exec, calls };
}

describe("the git provider", () => {
  it("is the plugin this one declared, and nothing else is called", async () => {
    const { exec, calls } = host({ entries: [{ path: "src/a.ts", status: "modified" }] });
    await gitDecorations(exec, PROVIDER, "/repo");
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe(`plugin.${PROVIDER}.status`);
  });

  it("is null when the manifest declares no git plugin", () => {
    expect(gitProvider({ runtimeDependencies: {} })).toBeNull();
    expect(gitProvider(null)).toBeNull();
  });

  it("is the declared id when there is one", () => {
    expect(gitProvider({
      runtimeDependencies: { plugins: [{ id: PROVIDER, version: "0.0.1" }] },
    })).toBe(PROVIDER);
  });
});

describe("decorations", () => {
  it("keep {path, status} and drop an untracked directory's trailing slash", async () => {
    const { exec } = host({
      entries: [
        { path: "src/a.ts", status: "modified" },
        { path: "docs/", status: "untracked" },
      ],
    });
    expect(await gitDecorations(exec, PROVIDER, "/repo")).toEqual([
      { path: "src/a.ts", status: "modified" },
      { path: "docs", status: "untracked" },
    ]);
  });

  it("no declared plugin → no decorations, and the tree still works", async () => {
    // A file tree without git is still a file tree. The decoration is an enrichment, so its absence
    // is an empty set — not a refusal, and never a plugin called "just in case".
    const { exec, calls } = host({});
    expect(await gitDecorations(exec, null, "/repo")).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
