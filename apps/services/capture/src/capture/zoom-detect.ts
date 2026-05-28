// 줌 화면 자기장 흰 원 검출 — 흰 픽셀 RANSAC 원 피팅 (순수 기하, opencv 무관 · 단독 테스트 가능).
// PoC(.local/poc_zoom_ring.py)에서 2v/4v 실프레임 검출 성공(inlier 25~39%)한 로직의 TS 포팅.

export type PixelPoint = [number, number];
export interface RingFit {
  px: number;
  py: number;
  pr: number;
  inliers: number;
  /** 검출에 쓴 흰 픽셀 대비 inlier 비율 (0~1). 신뢰도 게이트용. */
  coverage: number;
}

/** 세 점으로 원(중심·반경) 계산. 공선이면 null. */
export function circleFromThree(
  a: PixelPoint,
  b: PixelPoint,
  c: PixelPoint,
): { cx: number; cy: number; r: number } | null {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const [x3, y3] = c;
  const ax = x2 - x1;
  const ay = y2 - y1;
  const bx = x3 - x1;
  const by = y3 - y1;
  const e = ax * (x1 + x2) + ay * (y1 + y2);
  const f = bx * (x1 + x3) + by * (y1 + y3);
  const g = 2 * (ax * (y3 - y2) - ay * (x3 - x2));
  if (Math.abs(g) < 1e-9) return null;
  const cx = (by * e - ay * f) / g;
  const cy = (ax * f - bx * e) / g;
  return { cx, cy, r: Math.hypot(x1 - cx, y1 - cy) };
}

/**
 * 흰 픽셀들로 RANSAC 원 피팅 — 자기장 호에 가장 잘 맞는 원 1개.
 * @param pts 흰 픽셀 좌표
 * @param opts iters 반복수, tol inlier 거리허용(px), rMin/rMax 반경 범위(px)
 */
export function fitRing(
  pts: PixelPoint[],
  opts: { iters?: number; tol?: number; rMin?: number; rMax?: number } = {},
): RingFit | null {
  const { iters = 4000, tol = 3, rMin = 40, rMax = 2000 } = opts;
  const n = pts.length;
  if (n < 50) return null;
  let best: { cx: number; cy: number; r: number; inliers: number } | null = null;
  for (let t = 0; t < iters; t++) {
    const a = pts[(Math.random() * n) | 0];
    const b = pts[(Math.random() * n) | 0];
    const c = pts[(Math.random() * n) | 0];
    const cir = circleFromThree(a, b, c);
    if (!cir || cir.r < rMin || cir.r > rMax) continue;
    let inliers = 0;
    for (const [px, py] of pts) {
      if (Math.abs(Math.hypot(px - cir.cx, py - cir.cy) - cir.r) < tol) inliers++;
    }
    if (!best || inliers > best.inliers) best = { ...cir, inliers };
  }
  if (!best) return null;
  return {
    px: best.cx,
    py: best.cy,
    pr: best.r,
    inliers: best.inliers,
    coverage: best.inliers / n,
  };
}
