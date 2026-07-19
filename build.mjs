// The bundle — one ESM main.js from esbuild, which the loader imports through a blob URL.
// React and @pierre/trees are inlined. The CSS is a source string injected once.
import { build, context } from "esbuild";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(root, "src");
// plugin.json is the one source for the version, injected as __PLUGIN_VERSION__.
const manifest = JSON.parse(readFileSync(path.resolve(root, "plugin.json"), "utf8"));

const opts = {
  entryPoints: ["src/plugin-entry.tsx"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  alias: { "@": SRC },
  define: {
    "process.env.NODE_ENV": '"production"',
    "import.meta.env.DEV": "false",
    __PLUGIN_VERSION__: JSON.stringify(manifest.version),
  },
  outfile: "main.js",
  minify: false,
  legalComments: "none",
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context(opts);
  await ctx.watch();
  console.log("[file-tree] watching src → main.js …");
} else {
  await build(opts);
  console.log("[file-tree] built main.js");
}
