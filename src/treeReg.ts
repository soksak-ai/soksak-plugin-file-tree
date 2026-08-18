// The mounted tree views, by handle — what files.refresh and files.follow act on, either the
// active tree or the one a projectId names.
export interface TreeHandle {
  refresh: () => void;
  setFollow: (on: boolean) => void;
  getFollow: () => boolean;
}

const trees = new Map<string, TreeHandle>();
let active: string | null = null;

export function setTree(projectId: string, h: TreeHandle): void {
  trees.set(projectId, h);
  active = projectId;
}

export function clearTree(projectId: string): void {
  if (trees.delete(projectId) && active === projectId) active = null;
}

// Which project a command actually acted on. With none named it resolves to the active tree, and
// resolveTree resolves the same way — one rule, so the answer names the tree that was touched.
export function resolveTreeKey(projectId?: string): string | undefined {
  return projectId ?? active ?? undefined;
}

export function resolveTree(projectId?: string): TreeHandle | undefined {
  const key = resolveTreeKey(projectId);
  return key != null ? trees.get(key) : undefined;
}
