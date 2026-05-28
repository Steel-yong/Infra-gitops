'use client';
// 게임 종료(치킨/죽음) 감지 훅 — video 프레임 주기 샘플 → classifyEndFrame.
// 치킨(노랑)은 즉시 후보. 어두움('dark')은 게이트일 뿐 — OCR로 결과화면 텍스트가 확인돼야 죽음 확정
// (어두움만으로 초기화 금지: 동굴·야간 오판 방지). 연속 CONFIRM_COUNT회로 확정.

import { useEffect, useRef, useState } from 'react';
import type { Worker as TesseractWorker } from 'tesseract.js';
import { classifyEndFrame, isResultScreenText, type GameEndKind } from './endScreenClassifier';

const SAMPLE_W = 160; // 1차 픽셀 분류용 (가벼움)
const SAMPLE_H = 90;
const OCR_W = 640; // OCR용 크롭 (텍스트 읽을 해상도)
const OCR_H = 360;
/** 연속 N회 같은 결과여야 확정 — 순간 오탐(전환 프레임) 방지. */
const CONFIRM_COUNT = 3;

/**
 * 화면공유 video에서 게임 종료 화면을 감지한다.
 * 치킨/죽음이 CONFIRM_COUNT회 연속 잡히면 'chicken'/'death', 일반 화면으로 돌아오면 null.
 * 죽음은 어두움 게이트 통과 후 OCR(결과화면 텍스트)이 확인돼야만 확정.
 */
export function useGameEndDetect(
  video: HTMLVideoElement | null,
  enabled: boolean,
  intervalMs = 1500,
): GameEndKind {
  const [gameEnd, setGameEnd] = useState<GameEndKind>(null);
  const streakRef = useRef<{ kind: GameEndKind; n: number }>({ kind: null, n: 0 });
  const workerRef = useRef<TesseractWorker | null>(null);
  const busyRef = useRef(false); // OCR 진행 중 재진입 방지

  useEffect(() => {
    if (!video || !enabled) {
      setGameEnd(null);
      streakRef.current = { kind: null, n: 0 };
      return;
    }
    let stopped = false;
    const sample = document.createElement('canvas');
    sample.width = SAMPLE_W;
    sample.height = SAMPLE_H;
    const sctx = sample.getContext('2d', { willReadFrequently: true });
    const ocr = document.createElement('canvas');
    ocr.width = OCR_W;
    ocr.height = OCR_H;
    const octx = ocr.getContext('2d', { willReadFrequently: true });

    // 어두움 게이트 통과 시 1회 생성하는 tesseract 워커(한국어+영문 — PUBG 결과화면은 '다음'/'결과'/
    // '순위'/'로비' 한글 메뉴가 핵심, 영문은 #N/99 백업).
    const ensureWorker = async (): Promise<TesseractWorker> => {
      if (workerRef.current) return workerRef.current;
      const mod = await import('tesseract.js');
      const w = await mod.createWorker('kor+eng');
      if (stopped) {
        // 생성 대기 중 unmount/비활성 전환 → cleanup이 이미 지나 ref에 못 담으면 누수.
        // 여기서 즉시 종료하고 저장하지 않는다(누수 방지).
        await w.terminate();
        throw new Error('useGameEndDetect: stopped during worker init');
      }
      workerRef.current = w;
      return w;
    };

    const record = (kind: GameEndKind) => {
      const s = streakRef.current;
      if (kind === s.kind) s.n += 1;
      else streakRef.current = { kind, n: 1 };
      if (kind !== null && streakRef.current.n >= CONFIRM_COUNT) setGameEnd(kind);
      else if (kind === null) setGameEnd(null); // 일반 화면 복귀 → 해제(다음 게임 재무장)
    };

    const id = setInterval(async () => {
      if (busyRef.current || !sctx || !octx || !video.videoWidth || !video.videoHeight) return;
      sctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const cand = classifyEndFrame(sctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data);

      if (cand === 'chicken') {
        record('chicken');
        return;
      }
      if (cand !== 'dark') {
        record(null);
        return;
      }
      // 어두움 게이트 통과 → OCR로 결과화면 텍스트 확인돼야 죽음 확정.
      busyRef.current = true;
      try {
        const w = await ensureWorker();
        if (stopped) return;
        octx.drawImage(video, 0, 0, OCR_W, OCR_H);
        const { data } = await w.recognize(ocr);
        if (stopped) return;
        record(isResultScreenText(data.text) ? 'death' : null);
      } catch {
        // OCR 실패 → 죽음 미확정(어두움만으로 초기화하지 않음).
        if (!stopped) record(null);
      } finally {
        busyRef.current = false;
      }
    }, intervalMs);

    return () => {
      stopped = true;
      clearInterval(id);
      void workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [video, enabled, intervalMs]);

  return gameEnd;
}
