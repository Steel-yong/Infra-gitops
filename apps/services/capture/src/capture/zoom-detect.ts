// 줌 화면 자기장 검출 — opencv 없이 순수 기하.
// 1) 흰 원(=다음 자기장 후보): 흰 픽셀 RANSAC.
// 2) 외부 경계(=현재 자기장=앵커): 파란 외부영역 마스크의 INNER boundary 픽셀 RANSAC.
// 둘 다 검출되면 chain transform으로 줌 중 다음 자기장의 절대좌표를 계산 가능(능동추적).
// PoC(.local/poc_zoom_ring.py + poc_blue.py)에서 4v 실프레임 phase 비율 1.83 ≈ 이론 1.82 확인.

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

/**
 * 줌 화면의 "파란 외부영역(자기장 밖)" 안쪽 경계 픽셀 추출 — 현재 자기장(앵커) 경계.
 * 파란 마스크 픽셀 중 4-이웃에 비파란이 하나라도 있으면 boundary로 채집.
 * stride 2로 샘플, 우측 UI(>78%) 제외. fitRing에 그대로 넣어 외부 자기장 원 추정.
 *
 * @param raw RGB 평탄 버퍼 (3 채널, alpha 제거된 상태)
 * @param w 이미지 폭
 * @param h 이미지 높이
 */
export function extractBlueOutsideBoundary(
  raw: Buffer | Uint8Array,
  w: number,
  h: number,
): PixelPoint[] {
  // 1. blue-tint mask — 자기장 밖 어두운 파랑 픽셀 (PoC poc_blue.py와 동일 임계).
  const mask = new Uint8Array(w * h);
  const xlim = Math.floor(w * 0.78);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < xlim; x++) {
      const i = (y * w + x) * 3;
      const r = raw[i];
      const g = raw[i + 1];
      const b = raw[i + 2];
      if (b > r + 25 && b > g + 10 && b > 70 && r < 130) {
        mask[y * w + x] = 1;
      }
    }
  }
  // 2. boundary pixels — 파란 픽셀 중 4-이웃에 비파란이 하나라도 있으면 경계.
  const pts: PixelPoint[] = [];
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < xlim - 1; x += 2) {
      if (mask[y * w + x] === 0) continue;
      if (
        mask[(y - 1) * w + x] === 0 ||
        mask[(y + 1) * w + x] === 0 ||
        mask[y * w + (x - 1)] === 0 ||
        mask[y * w + (x + 1)] === 0
      ) {
        pts.push([x, y]);
      }
    }
  }
  return pts;
}
