// Node's test runner owns release and repository contracts; Vitest owns browser source tests.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), "utf8");
const json = (path) => JSON.parse(read(path));

test("the file tree owner declares one current release contract", () => {
  const manifest = json("plugin.json");
  const pkg = json("package.json");
  assert.equal(manifest.spec, undefined);
  assert.equal(manifest.appVersionRequirement, "0.0.1");
  assert.equal(manifest.version, pkg.version);
  assert.match(pkg.engines?.node ?? "", /^\d+\.\d+\.\d+$/);
  assert.match(pkg.packageManager ?? "", /^pnpm@\d+\.\d+\.\d+$/);
  assert.equal(pkg.private, true);
  assert.equal(pkg.publishConfig, undefined);
  assert.match(pkg.scripts?.verify ?? "", /node build\.mjs --check/);
  assert.doesNotMatch(pkg.scripts?.verify ?? "", /\bgit\b/);
  for (const section of [pkg.dependencies, pkg.devDependencies]) {
    for (const value of Object.values(section ?? {})) {
      assert.doesNotMatch(value, /^[~^*]|[<>]=?|\s-\s/);
    }
  }
  assert.deepEqual(json("release-files.json"), ["LICENSE", "README.ko.md", "README.md", "main.js", "plugin.json"]);
  assert.match(read("pnpm-workspace.yaml"), /allowBuilds:\s*\n\s+esbuild: true/);
  const makefile = read("Makefile");
  for (const target of ["preflight", "lock", "prepare", "build", "verify", "release", "attest"]) {
    assert.match(makefile, new RegExp(`^${target}:`, "m"));
  }
  for (const boundary of ["command -v soksak-sdk", "STORE", "OUT", "--store"]) assert.ok(makefile.includes(boundary), boundary);
  assert.match(read("soksak-spec.ref").trim(), /^[a-f0-9]{40}$/);
  assert.match(read("LICENSE"), /Apache License\s+Version 2\.0/);
  assert.ok(existsSync(join(root, "README.ko.md")));
  assert.ok(statSync(join(root, "main.js")).size < 500_000, "production bundle exceeds 500 KB");
});

test("the release workflow is manual and delegates verification to the owner Makefile", () => {
  const workflow = read(".github/workflows/release.yml");
  for (const required of [
    "workflow_dispatch:",
    "node-version-file: soksak-plugins/soksak-plugin-file-tree/.node-version",
    "cache-dependency-path: soksak-plugins/soksak-plugin-file-tree/pnpm-lock.yaml",
    "make verify",
    "release-template/publish-canonical-release.mjs",
    "GH_TOKEN: ${{ steps.release-token.outputs.token }}",
  ]) assert.ok(workflow.includes(required), required);
  assert.doesNotMatch(workflow, /push:|pull_request:/);
  assert.doesNotMatch(workflow, /node-version:\s*["']?\d/);
});
