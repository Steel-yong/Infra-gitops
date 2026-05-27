// 게임 종료 화면(치킨/죽음) 판별 — 순수 함수(테스트 용이).
// 치킨=대형 노란 텍스트(노랑비율). 죽음=어두움을 1차 게이트로 쓰고, OCR로 결과화면 텍스트가 확인돼야 확정.
// (어두움만으로 초기화 금지 — 동굴·야간 인게임 오판 방지.)

export type GameEndKind = 'chicken' | 'death' | null;
/** 1차 픽셀 분류 결과. 'dark'는 어두움 게이트 통과(=OCR 확인 필요)일 뿐 확정 죽음이 아니다. */
export type EndCandidate = 'chicken' | 'dark' | null;

/** 치킨: 노란 픽셀 비율 임계 (치킨 0.14 vs 그 외 ~0). */
export const CHICKEN_YELLOW_RATIO = 0.06;
/** 어두움 게이트: 어두운 픽셀 비율 임계(죽음·결과화면 ~0.72+). 단독으로 죽음 확정 금지 — OCR 확인 필수. */
export const DARK_RATIO = 0.72;

/**
 * 결과화면 좌하단 고정 "다음" 버튼 패턴 — 죽음 확정 신호.
 * 순위("#N/99")는 인원수가 99가 아닐 수 있어 취약 → 항상 같은 위치에 뜨는 "다음"으로 판정.
 * OCR 오차 여유로 글자 사이 공백 허용.
 */
const NEXT_BUTTON = /다\s*음/;

/**
 * 1차 픽셀 분류. 치킨(노랑)이 우선. 어두우면 'dark'(OCR 확인 대상). 둘 다 아니면 null.
 * ※ 'dark'는 죽음 확정이 아니라 후보 — useGameEndDetect가 OCR로 결과화면 텍스트를 확인해야 'death'.
 */
export function classifyEndFrame(pixels: Uint8ClampedArray): EndCandidate {
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
  if (dark / n >= DARK_RATIO) return 'dark';
  return null;
}

/** OCR로 읽은 텍스트에 좌하단 "다음" 버튼이 있는가 (어두움 게이트 통과 후 죽음 확정용). */
export function isNextButton(text: string): boolean {
  if (!text) return false;
  return NEXT_BUTTON.test(text);
}
