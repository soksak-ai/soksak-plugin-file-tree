// The git seam — the tree asks whoever implements soksak-spec-plugin-git, and finds it by contract.
//
// The provider id handed to these tests is deliberately not the one that ships: if an implementer's
// name were written anywhere in this plugin, they could not pass.
import { describe, expect, it } from "vitest";
import { GIT_CONTRACT, gitDecorations, gitProvider } from "./git";

const PROVIDER = "soksak-plugin-any-git";
const ENABLED = [{ id: PROVIDER, version: "1.0.0", status: "enabled" }];

function host({
  implementers = ENABLED,
  entries = [] as { path: string; status: string }[],
  calls = [] as { name: string; params?: Record<string, unknown> }[],
} = {}) {
  const exec = async (name: string, params?: Record<string, unknown>) => {
    calls.push({ name, params });
    if (name === "plugin.implementers") return { ok: true, data: { implementers } };
    if (name === `plugin.${PROVIDER}.status`) return { ok: true, data: { entries } };
    return { ok: true, data: {} };
  };
  return { exec, calls };
}

describe("the git provider", () => {
  it("is resolved by contract id, and never named", async () => {
    const { exec, calls } = host({ entries: [{ path: "src/a.ts", status: "modified" }] });
    await gitDecorations(exec, "/repo");
    expect(calls[0]).toEqual({ name: "plugin.implementers", params: { contract: GIT_CONTRACT } });
    expect(calls[1].name).toBe(`plugin.${PROVIDER}.status`);
    for (const c of calls) expect(c.name).not.toContain("git-core");
  });

  it("is null when nothing enabled implements the contract", async () => {
    const { exec } = host({ implementers: [] });
    expect(await gitProvider(exec)).toBeNull();
  });

  it("a disabled implementer is not a provider", async () => {
    const { exec } = host({ implementers: [{ id: PROVIDER, version: "1", status: "disabled" }] });
    expect(await gitProvider(exec)).toBeNull();
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
    expect(await gitDecorations(exec, "/repo")).toEqual([
      { path: "src/a.ts", status: "modified" },
      { path: "docs", status: "untracked" },
    ]);
  });

  it("no provider → no decorations, and the tree still works", async () => {
    // A file tree without git is still a file tree. The decoration is an enrichment, so its absence
    // is an empty set — not a refusal, and never an implementer named "just in case".
    const { exec, calls } = host({ implementers: [] });
    expect(await gitDecorations(exec, "/repo")).toEqual([]);
    expect(calls.filter((c) => c.name.startsWith(`plugin.${PROVIDER}`))).toHaveLength(0);
  });
});
