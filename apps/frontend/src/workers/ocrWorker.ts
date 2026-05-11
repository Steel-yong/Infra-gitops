// 미니맵 타이머 영역 파싱 및 자기장 빨간 느낌표 감지 Web Worker

/// <reference lib="webworker" />

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

export type OcrWorkerMessage =
  | { type: 'PROCESS'; text: string; pixels: number[]; width: number; height: number }
  | { type: 'STOP' };

export type OcrWorkerResponse =
  | { type: 'TIMER_STATE'; remainingSeconds: number | null; isShrinking: boolean }
  | { type: 'ERROR'; message: string };

self.onmessage = (event: MessageEvent<OcrWorkerMessage>) => {
  const msg = event.data;
  if (msg.type === 'STOP') return;

  try {
    const remainingSeconds = parseTimerString(msg.text);
    const pixels = new Uint8ClampedArray(msg.pixels);
    const isShrinking = detectExclamationMark(pixels);
    const res: OcrWorkerResponse = { type: 'TIMER_STATE', remainingSeconds, isShrinking };
    self.postMessage(res);
  } catch (err) {
    const res: OcrWorkerResponse = {
      type: 'ERROR',
      message: err instanceof Error ? err.message : 'OCR 처리 실패',
    };
    self.postMessage(res);
  }
};
