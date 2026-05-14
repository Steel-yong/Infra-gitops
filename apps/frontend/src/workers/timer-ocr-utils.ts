// OCR 타이머 파싱 + 해상도별 영역 좌표 + 빨간 느낌표 감지 유틸 (Worker/Hook 공용)

export const TIMER_REGIONS = {
  '1920x1080': { x: 1680, y: 820, w: 180, h: 35 },
  '2560x1440': { x: 2240, y: 1095, w: 240, h: 46 },
  '3840x2160': { x: 3360, y: 1640, w: 360, h: 70 },
} as const;

type Resolution = keyof typeof TIMER_REGIONS;

export interface TimerRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 화면 해상도에 맞는 타이머 영역 좌표를 반환. 매칭 해상도 없으면 1920x1080 기준 */
export function getTimerRegion(screenWidth: number, screenHeight: number): TimerRegion {
  const key = `${screenWidth}x${screenHeight}` as Resolution;
  return TIMER_REGIONS[key] ?? TIMER_REGIONS['1920x1080'];
}

/** "M:SS" 형식 문자열을 총 초로 변환. 파싱 실패 시 null 반환 */
export function parseTimerString(text: string): number | null {
  const match = text.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  return minutes * 60 + seconds;
}

/** RGBA 픽셀 배열에서 빨간 느낌표 픽셀 비율이 5% 초과인지 감지 (r>200, g<80, b<80) */
export function detectExclamationMark(pixels: Uint8ClampedArray): boolean {
  const total = pixels.length / 4;
  if (total === 0) return false;
  let redCount = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 200 && pixels[i + 1] < 80 && pixels[i + 2] < 80) {
      redCount++;
    }
  }
  return redCount / total > 0.05;
}
