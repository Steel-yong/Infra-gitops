// 게임 종료 화면(치킨/죽음) 판별 — 순수 함수(테스트 용이).
// 실제 화면 보정: 치킨=대형 노란 텍스트(노랑비율 0.14), 죽음=화면 어두움(0.81). 인게임 전체맵은 컬러라 미해당.

export type GameEndKind = 'chicken' | 'death' | null;

/** 치킨: 노란 픽셀 비율 임계 (치킨 0.14 vs 그 외 ~0). */
export const CHICKEN_YELLOW_RATIO = 0.06;
/** 죽음: 어두운 픽셀 비율 임계 (죽음 0.81 vs 인게임 컬러맵 낮음). 비행 어두움은 락 전이라 무해. */
export const DEATH_DARK_RATIO = 0.72;

/**
 * RGBA 픽셀 배열에서 게임 종료 화면을 판별한다.
 * 치킨이 죽음보다 우선(둘 다면 치킨). 둘 다 아니면 null.
 */
export function classifyEndFrame(pixels: Uint8ClampedArray): GameEndKind {
  let yellow = 0;
  let dark = 0;
  let n = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    n++;
    if (r >= 180 && g >= 140 && b <= 110 && r - b > 80) yellow++;
    if ((r + g + b) / 3 < 40) dark++;
  }
  if (n === 0) return null;
  if (yellow / n >= CHICKEN_YELLOW_RATIO) return 'chicken';
  if (dark / n >= DEATH_DARK_RATIO) return 'death';
  return null;
}
