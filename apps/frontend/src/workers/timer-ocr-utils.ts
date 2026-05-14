// OCR 타이머 파싱 + 해상도별 영역 좌표 + 빨간 느낌표 감지 유틸 (Worker/Hook 공용)

/**
 * 화면 비율 기준 타이머 영역. PUBG 미니맵 위쪽 타이머 영역에 충분히 큰 영역.
 * 1920×1080 기준 x≈1632, y≈702, w≈250, h≈108.
 */
const TIMER_REGION_RATIO = {
  x: 0.83,   // 좌측 살짝 줄임
  y: 0.67,   // 위쪽 살짝 줄임 (사용자 요청, 게임 세계 노이즈 감소)
  w: 0.17,
  h: 0.08,
} as const;

/** 기존 하드코딩 좌표는 호환을 위해 남겨두지만, getTimerRegion은 비율 기반으로 동작 */
export const TIMER_REGIONS = {
  '1920x1080': { x: 1632, y: 702, w: 250, h: 108 },
  '2560x1440': { x: 2176, y: 936, w: 333, h: 144 },
  '3840x2160': { x: 3264, y: 1404, w: 499, h: 216 },
} as const;

export interface TimerRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 화면 해상도에 맞는 타이머 영역 좌표를 반환. 비율 기반이라 모든 해상도 자동 대응. */
export function getTimerRegion(screenWidth: number, screenHeight: number): TimerRegion {
  return {
    x: Math.floor(screenWidth * TIMER_REGION_RATIO.x),
    y: Math.floor(screenHeight * TIMER_REGION_RATIO.y),
    w: Math.floor(screenWidth * TIMER_REGION_RATIO.w),
    h: Math.floor(screenHeight * TIMER_REGION_RATIO.h),
  };
}

/**
 * 텍스트 어디서든 "M:SS" 패턴을 찾아 총 초로 변환.
 * OCR이 페이즈 숫자나 다른 글자를 같이 인식해도 타이머만 추출하기 위해 앵커(^$) 제거.
 * 파싱 실패 시 null 반환.
 */
export function parseTimerString(text: string): number | null {
  const match = text.match(/(\d+):(\d{2})/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  return minutes * 60 + seconds;
}

/**
 * RGBA 픽셀 배열에서 빨간 느낌표 픽셀 비율로 자기장 줄어드는 중인지 감지.
 * 임계값 완화: R>150, G<100, B<100 (안티에일리어싱 고려), 비율 > 2%.
 */
export function detectExclamationMark(pixels: Uint8ClampedArray): boolean {
  const total = pixels.length / 4;
  if (total === 0) return false;
  let redCount = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // R이 G/B보다 명확히 높고, R 자체가 충분히 진한 빨강
    if (r > 150 && g < 100 && b < 100 && r > g + 60 && r > b + 60) {
      redCount++;
    }
  }
  return redCount / total > 0.02;
}
