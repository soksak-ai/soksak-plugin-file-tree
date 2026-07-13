// git decorations come from the contract, and the plugin that implements it is found by contract,
// never by name (C3 L2 contract-pin). The tree does not run git and does not know who does.
//
// No implementer is not an error here: a file tree without git decorations is still a file tree.
// That is the difference between this consumer and, say, a review plugin — the decoration is an
// enrichment, so its absence is an empty decoration set, not a refusal. What is banned either way is
// naming the implementer.

export const GIT_CONTRACT = "soksak-spec-plugin-git";

export interface GitStatusEntry {
  path: string;
  status: string;
}

type Envelope = { ok: boolean; data?: unknown };
type Exec = (name: string, params?: Record<string, unknown>) => Promise<Envelope>;

// The enabled implementer of the contract, or null. Resolved per call: an implementer is enabled and
// disabled at runtime, so a cached id is a claim about a fact that may already have changed.
export async function gitProvider(exec: Exec): Promise<string | null> {
  const out = await exec("plugin.implementers", { contract: GIT_CONTRACT });
  if (!out?.ok) return null;
  const list = (out.data as { implementers?: { id: string; status: string }[] } | undefined)
    ?.implementers;
  return (list ?? []).find((i) => i.status === "enabled")?.id ?? null;
}

// The decorations for a repository root. The contract's status answers porcelain-v2 entries; the
// tree needs only {path, status}, and an untracked directory's trailing slash is dropped so the path
// matches a tree node.
export async function gitDecorations(exec: Exec, root: string): Promise<GitStatusEntry[]> {
  const id = await gitProvider(exec);
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
