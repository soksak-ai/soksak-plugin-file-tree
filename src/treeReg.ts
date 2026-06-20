// 마운트된 트리 뷰 핸들 추적 — files.refresh/follow 명령이 활성(또는 지정 projectId) 트리를 조작.
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
