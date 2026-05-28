// 줌 자기장 로컬라이제이션 (A안) — 앵커 원(절대좌표)과 검출 링(픽셀)으로 픽셀↔게임 변환.
// opencv/sharp 무관 순수 기하 — 단독 유닛 테스트 가능. PUBG 맵은 북-고정·균일 줌이라 변환 = 스케일+이동.

/** 절대 게임좌표(0~1) 원 — 전체맵에서 락된 앵커. */
export type Anchor = { x: number; y: number; r: number };

/** 줌 화면에서 픽셀로 검출된 원. */
export type PixelCircle = { px: number; py: number; pr: number };

/**
 * 픽셀↔게임 변환. 픽셀(px0,py0)이 게임(gx0,gy0)에 대응, scale = 픽셀/정규화단위.
 * 원 = 크기 아는 자: scale = 검출 픽셀반경 / 앵커 정규화반경.
 */
export type ZoomTransform = {
  scale: number;
  px0: number;
  py0: number;
  gx0: number;
  gy0: number;
};

/**
 * 앵커 원(절대)과 그에 대응하는 검출 링(픽셀)으로 변환 도출.
 * 앵커 반경/검출 반경이 유효하지 않으면 null.
 */
export function deriveZoomTransform(anchor: Anchor, ring: PixelCircle): ZoomTransform | null {
  if (anchor.r <= 0 || ring.pr <= 0) return null;
  return {
    scale: ring.pr / anchor.r, // 픽셀 per 정규화단위
    px0: ring.px,
    py0: ring.py,
    gx0: anchor.x,
    gy0: anchor.y,
  };
}

/** 변환으로 픽셀 좌표 → 게임 좌표(0~1, 이미지 좌표계 — 위 0 아래 1). */
export function pixelToGame(t: ZoomTransform, px: number, py: number): { x: number; y: number } {
  return {
    x: t.gx0 + (px - t.px0) / t.scale,
    y: t.gy0 + (py - t.py0) / t.scale,
  };
}

/**
 * 다음 페이즈 원(줌 화면 안쪽 작은 링)을 절대좌표로 변환.
 * @param anchor 현재(부모) 절대 원
 * @param currentRing 줌 화면에서 검출된 현재 원(=앵커에 대응)
 * @param nextRing 줌 화면에서 검출된 다음 원(픽셀)
 * @param nextRadius 다음 페이즈 정규화 반경(알려진 값)
 * @returns 다음 자기장 절대 좌표 + 반경, 또는 변환 불가 시 null
 */
export function localizeNextZone(
  anchor: Anchor,
  currentRing: PixelCircle,
  nextRing: PixelCircle,
  nextRadius: number,
): { x: number; y: number; r: number } | null {
  const t = deriveZoomTransform(anchor, currentRing);
  if (!t) return null;
  const c = pixelToGame(t, nextRing.px, nextRing.py);
  return { x: c.x, y: c.y, r: nextRadius };
}
