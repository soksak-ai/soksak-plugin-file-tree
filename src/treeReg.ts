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

// 명령이 실제로 작용한 project(대상 트리)를 알려준다 — 명시 지정이 없으면 활성 트리로 해소.
// resolveTree 도 같은 규칙을 쓴다(단일 진실).
export function resolveTreeKey(projectId?: string): string | undefined {
  return projectId ?? active ?? undefined;
}

export function resolveTree(projectId?: string): TreeHandle | undefined {
  const key = resolveTreeKey(projectId);
  return key != null ? trees.get(key) : undefined;
}
