// C2 transparency conformance — the view's operable DOM nodes are declared and wired 1:1.
// Manifest contributes.nodes (what the plugin promises ui.tree exposes) must equal the
// data-node ids actually emitted in source (what the DOM carries). Neither side may lead:
// an undeclared data-node leaks a hidden control; a declared node with no wiring is a phantom.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SRC = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SRC, "..");

function declaredNodeIds(): string[] {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, "plugin.json"), "utf8"));
  const nodes: unknown = manifest?.contributes?.nodes;
  if (!Array.isArray(nodes)) return [];
  return nodes.map((n) => String((n as { id?: unknown }).id ?? ""));
}

// data-node="<id>" or data-node="<id>/<instance>" → the leading id token (before any "/").
function wiredNodeIds(): string[] {
  const ids = new Set<string>();
  const files = readdirSync(SRC).filter(
    (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );
  for (const f of files) {
    const text = readFileSync(path.join(SRC, f), "utf8");
    for (const m of text.matchAll(/data-node="([a-z0-9-]+)(?:\/[^"]*)?"/g)) {
      ids.add(m[1]);
    }
  }
  return [...ids];
}

describe("C2 node conformance", () => {
  it("declares at least one operable node (the view is not a black box)", () => {
    expect(declaredNodeIds().length).toBeGreaterThan(0);
  });

  it("manifest contributes.nodes equals the data-node ids wired in source", () => {
    const declared = [...new Set(declaredNodeIds())].sort();
    const wired = [...new Set(wiredNodeIds())].sort();
    expect(wired).toEqual(declared);
  });
});
