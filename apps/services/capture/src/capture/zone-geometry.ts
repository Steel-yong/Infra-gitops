// 자기장 기하 순수 헬퍼 — opencv/sharp 의존 없음(단독 유닛 테스트 가능).

/** 이전 페이즈 락된 자기장 (정규화 0~1). 다음 자기장은 이 원 안에 포함된다. */
export type ParentZone = { x: number; y: number; r: number };

/**
 * 새 자기장(중심 cx,cy / 반경 r)이 parent(이전 페이즈) 안에 포함되는지.
 * PUBG는 다음 존이 항상 현재 존 내부이므로, 부모와의 중심거리 ≤ (부모반경 − 새반경)이어야 한다.
 * 검출 오차 여유 tol은 **부모 반경에 비례**(parent.r * tolFrac)한다 — 절대값을 쓰면
 * 후반 페이즈(부모 r이 작음)에서 여유가 기하 한계를 압도해 부모 밖 원도 통과한다.
 * parent가 없으면 제약 없음(true).
 */
export function isZoneInsideParent(
  cx: number,
  cy: number,
  r: number,
  parent?: ParentZone,
  tolFrac = 0.2,
): boolean {
  if (!parent) return true;
  const d = Math.hypot(cx - parent.x, cy - parent.y);
  return d <= parent.r - r + parent.r * tolFrac;
}
