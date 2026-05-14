'use client';
// 화면공유 비디오에서 미니맵 타이머 영역을 1초마다 Tesseract.js로 OCR해 잔여 초·자기장 상태를 반환하는 훅

import { useEffect, useRef, useState } from 'react';
import {
  getTimerRegion,
  parseTimerString,
  detectExclamationMark,
  type TimerRegion,
} from '../workers/timer-ocr-utils';

export interface OcrTimerState {
  /** OCR이 인식한 원본 텍스트 (내부 디버깅용, UI에는 미표시) */
  rawText: string;
  /** 파싱된 잔여 초 (인식 실패 시 null) */
  remainingSeconds: number | null;
  /** 빨간 느낌표 감지 여부 (true=자기장 줄어드는 중) */
  isShrinking: boolean;
  /** 크롭한 타이머 영역 이미지 (내부 디버깅용) */
  cropDataUrl: string | null;
  /** 사용 중인 타이머 영역 좌표 (내부 디버깅용) */
  region: TimerRegion | null;
  /** 인식 시도 횟수 (내부 디버깅용) */
  attempts: number;
}

const INITIAL_STATE: OcrTimerState = {
  rawText: '',
  remainingSeconds: null,
  isShrinking: false,
  cropDataUrl: null,
  region: null,
  attempts: 0,
};

/**
 * intervalMs 간격으로 video 요소에서 미니맵 타이머 영역을 크롭해 Tesseract.js로 OCR한다.
 * Tesseract worker는 마운트 시 1회 초기화하고 언마운트 시 terminate한다.
 * video가 null이거나 enabled=false면 worker를 만들지 않는다.
 * intervalMs는 테스트에서 짧게 주입하기 위해 옵션화 (기본 1000ms).
 */
export function useOcrTimer(
  video: HTMLVideoElement | null,
  enabled: boolean,
  intervalMs = 1000,
): OcrTimerState {
  const [state, setState] = useState<OcrTimerState>(INITIAL_STATE);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!video || !enabled) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null;

    (async () => {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789:',
        tessedit_pageseg_mode: '7' as never,
      });
      if (cancelled) {
        await worker.terminate();
        worker = null;
        return;
      }

      intervalId = setInterval(async () => {
        if (busyRef.current || !worker) return;
        if (!video.videoWidth || !video.videoHeight) return;

        busyRef.current = true;
        try {
          const region = getTimerRegion(video.videoWidth, video.videoHeight);

          const canvas = document.createElement('canvas');
          canvas.width = region.w;
          canvas.height = region.h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);

          const cropDataUrl = canvas.toDataURL('image/png');
          const result = await worker.recognize(cropDataUrl);
          const rawText = result.data.text.trim();
          const remainingSeconds = parseTimerString(rawText);

          // 느낌표 감지용 픽셀 (타이머 좌측 작은 영역)
          const flagW = Math.floor(region.w * 0.2);
          const flagCanvas = document.createElement('canvas');
          flagCanvas.width = flagW;
          flagCanvas.height = region.h;
          const flagCtx = flagCanvas.getContext('2d', { willReadFrequently: true });
          if (!flagCtx) return;
          flagCtx.drawImage(
            video,
            region.x - flagW,
            region.y,
            flagW,
            region.h,
            0,
            0,
            flagW,
            region.h,
          );
          const flagPixels = flagCtx.getImageData(0, 0, flagW, region.h).data;
          const isShrinking = detectExclamationMark(flagPixels);

          setState((prev) => ({
            rawText,
            remainingSeconds,
            isShrinking,
            cropDataUrl,
            region,
            attempts: prev.attempts + 1,
          }));
        } finally {
          busyRef.current = false;
        }
      }, intervalMs);
    })();

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
      worker?.terminate();
    };
  }, [video, enabled, intervalMs]);

  return state;
}
