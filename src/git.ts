// Git decorations come from the plugin this one declares in runtimeDependencies. The tree does not run git.
//
// It asked "who implements soksak-spec-plugin-git" until 2026-08-16. A plugin holds its own spec now
// and whoever needs a thing names the plugin (soksak-core C3, C3a): a shared spec over several git
// implementations would force a rule onto the parts that differ, and it charged every plugin for a
// convenience most of them never used.
//
// No git plugin is not an error: a file tree without decorations is still a file tree. The
// decoration is an enrichment, so its absence is an empty set, not a refusal.

import { runtimePluginReferences } from "./runtimeDependencies";

export interface GitStatusEntry {
  path: string;
  status: string;
}

type Envelope = { ok: boolean; data?: unknown };
type Exec = (name: string, params?: Record<string, unknown>) => Promise<Envelope>;

// The git plugin this one declared in runtimeDependencies.plugins, read from its own manifest. Read where the manifest is — at
// activation — and handed down, so nothing else needs the manifest to draw a tree.
export function gitProvider(manifest: unknown): string | null {
  return runtimePluginReferences(manifest).find((dependency) => dependency.id.includes("git"))?.id ?? null;
}

// The decorations for a repository root. The contract's status answers porcelain-v2 entries; the
// tree needs only {path, status}, and an untracked directory's trailing slash is dropped so the path
// matches a tree node.
export async function gitDecorations(
  exec: Exec,
  gitPlugin: string | null,
  root: string,
): Promise<GitStatusEntry[]> {
  const id = gitPlugin;
  if (!id) return [];
  const out = await exec(`plugin.${id}.status`, { path: root });
  const entries =
    out.ok && out.data && typeof out.data === "object"
      ? ((out.data as { entries?: { path: string; status: string }[] }).entries ?? [])
      : [];
  return entries.map((e) => ({
    path: String(e.path).replace(/\/+$/, ""),
    status: e.status,
  }));
}
