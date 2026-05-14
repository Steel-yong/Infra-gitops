// 미니맵 타이머 영역 파싱 및 자기장 빨간 느낌표 감지 Web Worker

/// <reference lib="webworker" />

import {
  TIMER_REGIONS,
  getTimerRegion,
  parseTimerString,
  detectExclamationMark,
  type TimerRegion,
} from './timer-ocr-utils';

// 기존 import 경로 호환을 위해 re-export
export { TIMER_REGIONS, getTimerRegion, parseTimerString, detectExclamationMark };
export type { TimerRegion };

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
