'use client';
// OCR 한 번으로 타이머 락 → 그때부터 로컬 카운트다운으로 정밀 표시.
// OCR은 노이즈 + 비용 크므로 락 후엔 10초마다만 드리프트 보정.
// 빨간 느낌표 감지 = 자기장 줄어드는 중 = 알람 불필요.

import { useEffect, useRef, useState } from 'react';
import {
  getTimerRegion,
  parseTimerString,
  detectExclamationMark,
  type TimerRegion,
} from '../workers/timer-ocr-utils';

export type OcrStatus = 'idle' | 'loading' | 'searching' | 'locked' | 'shrinking' | 'error';

export interface OcrTimerState {
  rawText: string;
  /** 현재 잔여 초 (락 후엔 로컬 타이머로 매초 감소) */
  remainingSeconds: number | null;
  isShrinking: boolean;
  cropDataUrl: string | null;
  region: TimerRegion | null;
  attempts: number;
  status: OcrStatus;
  errorMessage: string | null;
}

const INITIAL_STATE: OcrTimerState = {
  rawText: '',
  remainingSeconds: null,
  isShrinking: false,
  cropDataUrl: null,
  region: null,
  attempts: 0,
  status: 'idle',
  errorMessage: null,
};

const OCR_REVERIFY_SECONDS = 5; // 락 후 5초마다 OCR 보정
const OCR_DRIFT_TOLERANCE = 3; // 로컬 추정과 OCR 값이 3초 이상 차이나면 OCR로 재동기화
/** OCR 처리 지연 보상 — Tesseract OCR 한 사이클이 약 1~2초 걸려서
 * OCR이 읽은 시점에 게임은 그만큼 더 진행된 상태. 락할 때 빼서 게임과 sync 맞춤. */
const OCR_LAG_COMPENSATION_SECONDS = 2.5;

export function useOcrTimer(
  video: HTMLVideoElement | null,
  enabled: boolean,
  intervalMs = 1000,
): OcrTimerState {
  const [state, setState] = useState<OcrTimerState>(INITIAL_STATE);
  const busyRef = useRef(false);
  // 락 상태 추적
  const lockedAtRef = useRef<number | null>(null); // 락 시점 epoch ms
  const lockedSecondsRef = useRef<number | null>(null); // 락 시점 잔여 초
  const lastOcrTimeRef = useRef(0); // 마지막 OCR 시도 epoch ms

  useEffect(() => {
    if (!video || !enabled) {
      console.log('[OCR] idle — video:', !!video, 'enabled:', enabled);
      lockedAtRef.current = null;
      lockedSecondsRef.current = null;
      setState({ ...INITIAL_STATE });
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null;

    console.log('[OCR] 초기화 시작 — video:', video.videoWidth, 'x', video.videoHeight);
    setState((prev) => ({ ...prev, status: 'loading', errorMessage: null }));

    (async () => {
      try {
        console.log('[OCR] Tesseract.js dynamic import...');
        const { createWorker } = await import('tesseract.js');
        console.log('[OCR] createWorker 호출');
        worker = await createWorker('eng');
        console.log('[OCR] worker 생성 완료, 파라미터 설정');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789:',
          tessedit_pageseg_mode: '7' as never,
        });
        if (cancelled) {
          await worker.terminate();
          worker = null;
          return;
        }

        console.log('[OCR] searching — 타이머 락 시도');
        setState((prev) => ({ ...prev, status: 'searching' }));

        let firstAttempt = true;
        intervalId = setInterval(async () => {
          if (busyRef.current || !worker) return;
          if (!video.videoWidth || !video.videoHeight) return;

          const now = Date.now();

          // 0) 락 상태일 때 로컬 카운트다운 갱신
          if (lockedAtRef.current !== null && lockedSecondsRef.current !== null) {
            const elapsed = (now - lockedAtRef.current) / 1000;
            const localRemaining = Math.max(0, Math.round(lockedSecondsRef.current - elapsed));

            // 매번 video 프레임에서 느낌표만 빠르게 확인 (OCR 안 함)
            const region = getTimerRegion(video.videoWidth, video.videoHeight);
            const flagCanvas = document.createElement('canvas');
            const flagW = Math.floor(region.w * 0.2);
            flagCanvas.width = flagW;
            flagCanvas.height = region.h;
            const flagCtx = flagCanvas.getContext('2d', { willReadFrequently: true });
            const isShrinking = (() => {
              if (!flagCtx) return false;
              // 빨간 느낌표는 크롭 영역의 LEFT 안쪽에 위치 (region.x 직후 좌측 20%)
              flagCtx.drawImage(
                video, region.x, region.y, flagW, region.h, 0, 0, flagW, region.h,
              );
              return detectExclamationMark(
                flagCtx.getImageData(0, 0, flagW, region.h).data,
              );
            })();

            // 줄어드는 중이면 락 해제 (다음 자기장 대기로 전환은 OCR이 다시 잡으면 됨)
            if (isShrinking) {
              console.log('[OCR] 자기장 줄어드는 중 감지 — 락 해제');
              lockedAtRef.current = null;
              lockedSecondsRef.current = null;
              setState((prev) => ({
                ...prev,
                status: 'shrinking',
                isShrinking: true,
                remainingSeconds: null,
              }));
              return;
            }

            // 드리프트 보정: 10초마다 OCR 한 번 확인
            const sinceLastOcr = (now - lastOcrTimeRef.current) / 1000;
            if (sinceLastOcr < OCR_REVERIFY_SECONDS) {
              setState((prev) => ({
                ...prev,
                remainingSeconds: localRemaining,
                isShrinking: false,
              }));
              return;
            }
          }

          // 1) OCR 실행 (searching 상태 또는 락 보정 시점)
          busyRef.current = true;
          try {
            const region = getTimerRegion(video.videoWidth, video.videoHeight);
            if (firstAttempt) {
              console.log(
                '[OCR] 실제 video 해상도:', video.videoWidth, 'x', video.videoHeight,
                '/ 크롭 영역:', JSON.stringify(region),
              );
              firstAttempt = false;
            }

            // 미리보기 (원본 크롭)
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = region.w;
            previewCanvas.height = region.h;
            const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
            if (!previewCtx) return;
            previewCtx.drawImage(
              video, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h,
            );
            const cropDataUrl = previewCanvas.toDataURL('image/png');

            // ★ 먼저 빨간 느낌표 체크 — 줄어드는 중이면 OCR 자체를 스킵 (비용 절감 + 노이즈 차단)
            const flagW0 = Math.floor(region.w * 0.2);
            const flagCanvas0 = document.createElement('canvas');
            flagCanvas0.width = flagW0;
            flagCanvas0.height = region.h;
            const flagCtx0 = flagCanvas0.getContext('2d', { willReadFrequently: true });
            const shrinkingNow = (() => {
              if (!flagCtx0) return false;
              flagCtx0.drawImage(
                video, region.x, region.y, flagW0, region.h, 0, 0, flagW0, region.h,
              );
              return detectExclamationMark(
                flagCtx0.getImageData(0, 0, flagW0, region.h).data,
              );
            })();
            if (shrinkingNow) {
              console.log('[OCR] 빨간 느낌표 감지 — OCR 스킵, 줄어드는 중 상태');
              lockedAtRef.current = null;
              lockedSecondsRef.current = null;
              setState((prev) => ({
                ...prev,
                cropDataUrl, region,
                attempts: prev.attempts + 1,
                rawText: '',
                remainingSeconds: null,
                isShrinking: true,
                status: 'shrinking',
              }));
              return;
            }

            // OCR용 전처리: 3배 확대 + 순수 흰색 필터 + 색 반전
            const SCALE = 3;
            const procCanvas = document.createElement('canvas');
            procCanvas.width = region.w * SCALE;
            procCanvas.height = region.h * SCALE;
            const procCtx = procCanvas.getContext('2d', { willReadFrequently: true });
            if (!procCtx) return;
            procCtx.imageSmoothingEnabled = false;
            procCtx.drawImage(
              video, region.x, region.y, region.w, region.h,
              0, 0, region.w * SCALE, region.h * SCALE,
            );
            const imgData = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
            const pixels = imgData.data;
            for (let i = 0; i < pixels.length; i += 4) {
              const isWhiteText =
                pixels[i] > 220 && pixels[i + 1] > 220 && pixels[i + 2] > 220;
              const v = isWhiteText ? 0 : 255;
              pixels[i] = v;
              pixels[i + 1] = v;
              pixels[i + 2] = v;
            }
            procCtx.putImageData(imgData, 0, 0);

            const result = await worker.recognize(procCanvas.toDataURL('image/png'));
            const rawText = result.data.text.trim();
            const ocrSeconds = parseTimerString(rawText);
            console.log('[OCR] 인식 결과:', JSON.stringify(rawText), '→', ocrSeconds);
            lastOcrTimeRef.current = now;

            // 느낌표 감지
            const flagW = Math.floor(region.w * 0.2);
            const flagCanvas = document.createElement('canvas');
            flagCanvas.width = flagW;
            flagCanvas.height = region.h;
            const flagCtx = flagCanvas.getContext('2d', { willReadFrequently: true });
            const isShrinking = (() => {
              if (!flagCtx) return false;
              // 빨간 느낌표는 크롭 영역의 LEFT 안쪽에 위치 (region.x 직후 좌측 20%)
              flagCtx.drawImage(
                video, region.x, region.y, flagW, region.h, 0, 0, flagW, region.h,
              );
              return detectExclamationMark(
                flagCtx.getImageData(0, 0, flagW, region.h).data,
              );
            })();

            if (isShrinking) {
              lockedAtRef.current = null;
              lockedSecondsRef.current = null;
              setState((prev) => ({
                ...prev,
                rawText, cropDataUrl, region,
                attempts: prev.attempts + 1,
                remainingSeconds: null,
                isShrinking: true,
                status: 'shrinking',
              }));
              return;
            }

            if (ocrSeconds !== null) {
              // OCR 처리 지연 보상: 락하는 값에서 OCR_LAG_COMPENSATION_SECONDS 빼서 게임과 sync
              const compensated = Math.max(0, ocrSeconds - OCR_LAG_COMPENSATION_SECONDS);
              // 첫 락 또는 드리프트 보정
              const wasLocked = lockedAtRef.current !== null && lockedSecondsRef.current !== null;
              if (!wasLocked) {
                console.log(
                  `[OCR] 타이머 락 — OCR=${ocrSeconds}s → 보정 후 ${compensated}s (lag ${OCR_LAG_COMPENSATION_SECONDS}s 차감)`,
                );
                lockedAtRef.current = now;
                lockedSecondsRef.current = compensated;
              } else {
                const elapsed = (now - lockedAtRef.current!) / 1000;
                const localEstimate = lockedSecondsRef.current! - elapsed;
                if (Math.abs(localEstimate - compensated) > OCR_DRIFT_TOLERANCE) {
                  console.log(
                    `[OCR] 드리프트 보정 — local=${localEstimate.toFixed(1)}s, OCR(보정후)=${compensated}s`,
                  );
                  lockedAtRef.current = now;
                  lockedSecondsRef.current = compensated;
                }
              }
              setState((prev) => ({
                ...prev,
                rawText, cropDataUrl, region,
                attempts: prev.attempts + 1,
                remainingSeconds: Math.round(compensated),
                isShrinking: false,
                status: 'locked',
              }));
            } else {
              setState((prev) => ({
                ...prev,
                rawText, cropDataUrl, region,
                attempts: prev.attempts + 1,
                isShrinking: false,
              }));
            }
          } finally {
            busyRef.current = false;
          }
        }, intervalMs);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[OCR] 실패:', msg, err);
        setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
      }
    })();

    return () => {
      cancelled = true;
      if (intervalId !== null) clearInterval(intervalId);
      worker?.terminate();
    };
  }, [video, enabled, intervalMs]);

  return state;
}
