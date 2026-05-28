'use client';
// OCR 한 번으로 타이머 락 → 그때부터 로컬 카운트다운으로 정밀 표시.
// OCR은 노이즈 + 비용 크므로 락 후엔 10초마다만 드리프트 보정.
// 빨간 느낌표 감지 = 자기장 줄어드는 중 = 알람 불필요.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTimerRegion,
  getPhaseRegion,
  parseTimerString,
  parsePhaseString,
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
  /** OCR이 화면 "페이즈 N" 영역에서 인식한 현재 페이즈 (1~8). null = 미인식. */
  currentPhase: number | null;
  /** 페이즈 OCR 디버그 — ROI 보정용 미리보기 */
  phaseRawText: string;
  phaseCropDataUrl: string | null;
  phaseRegion: TimerRegion | null;
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
  currentPhase: null,
  phaseRawText: '',
  phaseCropDataUrl: null,
  phaseRegion: null,
};

/** 동적 import 재시도 — next dev에서 청크 로드가 간헐적으로 실패(ChunkLoadError)하므로 몇 번 재시도. */
async function importWithRetry<T>(load: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await load();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

const OCR_REVERIFY_SECONDS = 3; // 락 후 3초마다 OCR 보정
const OCR_DRIFT_TOLERANCE = 3; // 로컬 추정과 OCR 값이 3초 이상 차이나면 OCR로 재동기화
// OCR 처리 지연은 매 호출마다 performance.now()로 실측해서 동적으로 차감 (환경 무관 sync).

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
  const lastPhaseOcrRef = useRef(0); // 마지막 페이즈 OCR 시도 epoch ms (1초 주기)
  // 페이즈 OCR 신뢰도 — N번 연속 같은 페이즈일 때만 currentPhase 갱신.
  // 한 번의 잘못된 OCR 결과(예: "1"을 "5"로 잘못 읽음)가 검출 망치지 않도록.
  const phaseHistoryRef = useRef<number[]>([]);
  const PHASE_CONFIRM_COUNT = 2; // 1초 주기 × 2 = 2초 안에 페이즈 락
  // ※ Sticky 룰: 한번 락된 currentPhase는 다른 페이즈가 확정될 때까지 유지.
  //   맵 닫힘/파밍 중 OCR이 빈 결과를 줘도 currentPhase 절대 null로 리셋 안 함.
  //   리셋이 필요하면 사용자가 명시적으로 새 페이즈를 인식시켜야 함 (예: 다음 페이즈 형성).
  //   또는 사용자가 명시적으로 reset() 호출 (예: "다시 잡기" 버튼) — 페이즈 sticky 해제.

  // 사용자 명시 초기화 — sticky 페이즈·히스토리·타이머 락 전부 클리어 (다시잡기 버튼용).
  const reset = useCallback(() => {
    phaseHistoryRef.current = [];
    lastPhaseOcrRef.current = 0;
    lockedAtRef.current = null;
    lockedSecondsRef.current = null;
    lastOcrTimeRef.current = 0;
    setState(INITIAL_STATE);
  }, []);

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
        const { createWorker } = await importWithRetry(() => import('tesseract.js'), 3);
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

          // tick 시작 시점 — setInterval 큐잉 + 전처리 + OCR 처리 전체를 lag으로 측정
          const tickStartedAt = performance.now();
          const now = Date.now();

          // ★ 페이즈 OCR — 타이머 OCR의 게이트(락·줄어듦·재검증 return)와 독립적으로 가장 먼저 실행.
          //   줄어드는 중·관전 등 어떤 상태에서도 페이즈(=검출용 hintPhase)는 갱신돼야 한다.
          //   (tesseract 워커는 recognize 호출을 직렬 큐잉하므로 타이머 OCR과 동시 호출돼도 안전.)
          const phaseSinceLast = (now - lastPhaseOcrRef.current) / 1000;
          if (phaseSinceLast >= 1) {
            lastPhaseOcrRef.current = now;
            try {
              const PHASE_SCALE = 3;
              const phaseRegion = getPhaseRegion(video.videoWidth, video.videoHeight);
              const phasePreviewCanvas = document.createElement('canvas');
              phasePreviewCanvas.width = phaseRegion.w;
              phasePreviewCanvas.height = phaseRegion.h;
              const phasePreviewCtx = phasePreviewCanvas.getContext('2d', { willReadFrequently: true });
              let phaseCropDataUrl: string | null = null;
              if (phasePreviewCtx) {
                phasePreviewCtx.drawImage(
                  video, phaseRegion.x, phaseRegion.y, phaseRegion.w, phaseRegion.h,
                  0, 0, phaseRegion.w, phaseRegion.h,
                );
                phaseCropDataUrl = phasePreviewCanvas.toDataURL('image/png');
              }
              const phaseCanvas = document.createElement('canvas');
              phaseCanvas.width = phaseRegion.w * PHASE_SCALE;
              phaseCanvas.height = phaseRegion.h * PHASE_SCALE;
              const phaseCtx = phaseCanvas.getContext('2d', { willReadFrequently: true });
              if (phaseCtx) {
                phaseCtx.imageSmoothingEnabled = false;
                phaseCtx.drawImage(
                  video, phaseRegion.x, phaseRegion.y, phaseRegion.w, phaseRegion.h,
                  0, 0, phaseRegion.w * PHASE_SCALE, phaseRegion.h * PHASE_SCALE,
                );
                const pImg = phaseCtx.getImageData(0, 0, phaseCanvas.width, phaseCanvas.height);
                const pPx = pImg.data;
                for (let i = 0; i < pPx.length; i += 4) {
                  const isWhite = pPx[i] > 220 && pPx[i + 1] > 220 && pPx[i + 2] > 220;
                  const v = isWhite ? 0 : 255;
                  pPx[i] = v; pPx[i + 1] = v; pPx[i + 2] = v;
                }
                phaseCtx.putImageData(pImg, 0, 0);
                const phaseResult = await worker.recognize(phaseCanvas.toDataURL('image/png'));
                const phaseText = phaseResult.data.text.trim();
                const detected = parsePhaseString(phaseText);
                setState((prev) => ({
                  ...prev,
                  phaseRawText: phaseText,
                  phaseCropDataUrl,
                  phaseRegion,
                }));
                const hist = phaseHistoryRef.current;
                if (detected !== null) {
                  if (hist.length > 0 && hist[hist.length - 1] !== detected) {
                    phaseHistoryRef.current = [detected];
                  } else {
                    hist.push(detected);
                  }
                } else {
                  phaseHistoryRef.current = [];
                }
                const stable = phaseHistoryRef.current.length >= PHASE_CONFIRM_COUNT
                  ? phaseHistoryRef.current[phaseHistoryRef.current.length - 1]
                  : null;
                console.log(
                  `[OCR] 페이즈 OCR: text=${JSON.stringify(phaseText)} → ${detected} ` +
                  `(history ${phaseHistoryRef.current.length}/${PHASE_CONFIRM_COUNT}, stable=${stable})`,
                );
                if (stable !== null) {
                  setState((prev) =>
                    prev.currentPhase === stable ? prev : { ...prev, currentPhase: stable },
                  );
                }
              }
            } catch (e) {
              console.warn('[OCR] 페이즈 인식 실패:', e);
            }
          }

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
            const SCALE = 3; // OCR 전처리 확대 배율 (타이머·페이즈 공용)

            // ★ 줄어드는 중이면 타이머 OCR만 스킵 — 페이즈 OCR은 아래에서 계속 실행해야 함
            //   (검출이 hintPhase에 의존하므로 줄어드는 동안에도 페이즈는 갱신돼야 한다)
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
            } else {
            // OCR용 전처리: 3배 확대 + 순수 흰색 필터 + 색 반전
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
            const lagSeconds = (performance.now() - tickStartedAt) / 1000;
            const rawText = result.data.text.trim();
            const ocrSeconds = parseTimerString(rawText);
            console.log(
              `[OCR] 인식 결과: ${JSON.stringify(rawText)} → ${ocrSeconds}, lag=${lagSeconds.toFixed(2)}s`,
            );
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
            } else if (ocrSeconds !== null) {
              // OCR 처리 지연 보상: 이번 호출의 실측 lag만큼 차감해서 게임과 sync (동적)
              const compensated = Math.max(0, ocrSeconds - lagSeconds);
              // 첫 락 또는 드리프트 보정
              const wasLocked = lockedAtRef.current !== null && lockedSecondsRef.current !== null;
              if (!wasLocked) {
                console.log(
                  `[OCR] 타이머 락 — OCR=${ocrSeconds}s → 보정 후 ${compensated.toFixed(2)}s (실측 lag ${lagSeconds.toFixed(2)}s 차감)`,
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
            } // ← 줄어드는 중(shrinkingNow)이 아닐 때만 타이머 OCR. 페이즈 OCR은 항상 실행.

            // (페이즈 OCR은 tick 최상단으로 이동 — 락·줄어듦·재검증 게이트와 무관하게 항상 실행.)
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

  return { ...state, reset };
}
