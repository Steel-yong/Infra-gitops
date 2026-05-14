'use client';
// 화면공유 비디오에서 미니맵 타이머 영역을 1초마다 Tesseract.js로 OCR해 잔여 초·자기장 상태를 반환하는 훅

import { useEffect, useRef, useState } from 'react';
import {
  getTimerRegion,
  parseTimerString,
  detectExclamationMark,
  type TimerRegion,
} from '../workers/ocrWorker';

export interface OcrTimerState {
  /** OCR이 인식한 원본 텍스트 (디버깅용) */
  rawText: string;
  /** 파싱된 잔여 초 (인식 실패 시 null) */
  remainingSeconds: number | null;
  /** 빨간 느낌표 감지 여부 (true=자기장 줄어드는 중) */
  isShrinking: boolean;
  /** OCR로 크롭한 타이머 영역 이미지 (Data URL, 디버깅용) */
  cropDataUrl: string | null;
  /** 사용 중인 타이머 영역 좌표 */
  region: TimerRegion | null;
  /** 인식 시도 횟수 */
  attempts: number;
}

/**
 * 1초 간격으로 video 요소에서 미니맵 타이머 영역을 크롭해 Tesseract.js로 OCR한다.
 * Tesseract worker는 마운트 시 1회 초기화하고 언마운트 시 정리한다.
 */
export function useOcrTimer(video: HTMLVideoElement | null, enabled: boolean): OcrTimerState {
  const [state, setState] = useState<OcrTimerState>({
    rawText: '',
    remainingSeconds: null,
    isShrinking: false,
    cropDataUrl: null,
    region: null,
    attempts: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerRef = useRef<Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null>(
    null,
  );
  const busyRef = useRef(false);

  useEffect(() => {
    if (!video || !enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    let cancelled = false;

    (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789:',
        tessedit_pageseg_mode: '7' as never,
      });
      if (cancelled) {
        await worker.terminate();
        return;
      }
      workerRef.current = worker;

      intervalRef.current = setInterval(async () => {
        if (busyRef.current || !workerRef.current) return;
        if (!video.videoWidth || !video.videoHeight) return;

        busyRef.current = true;
        try {
          const region = getTimerRegion(video.videoWidth, video.videoHeight);

          // 타이머 영역 크롭용 캔버스
          const canvas = document.createElement('canvas');
          canvas.width = region.w;
          canvas.height = region.h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);

          // OCR
          const cropDataUrl = canvas.toDataURL('image/png');
          const result = await workerRef.current.recognize(cropDataUrl);
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
      }, 1000);
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [video, enabled]);

  return state;
}
