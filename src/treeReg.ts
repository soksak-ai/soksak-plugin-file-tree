// The mounted tree views, by handle — what files.refresh and files.follow act on.
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

export function resolveTree(projectId?: string): TreeHandle | undefined {
  const key = projectId ?? active ?? undefined;
  return key != null ? trees.get(key) : undefined;
}
