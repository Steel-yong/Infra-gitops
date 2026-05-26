'use client';
// 게임 종료(치킨/죽음) 감지 훅 — video 프레임을 주기적으로 샘플 → classifyEndFrame → 연속 확인 후 신호.

import { useEffect, useRef, useState } from 'react';
import { classifyEndFrame, type GameEndKind } from './endScreenClassifier';

const SAMPLE_W = 160;
const SAMPLE_H = 90;
/** 연속 N회 같은 결과여야 확정 — 순간 오탐(전환 프레임) 방지. intervalMs × N 만큼 지속돼야 함. */
const CONFIRM_COUNT = 3;

/**
 * 화면공유 video에서 게임 종료 화면을 감지한다.
 * 종료 화면이 CONFIRM_COUNT회 연속 잡히면 'chicken'/'death', 일반 화면으로 돌아오면 null.
 */
export function useGameEndDetect(
  video: HTMLVideoElement | null,
  enabled: boolean,
  intervalMs = 1500,
): GameEndKind {
  const [gameEnd, setGameEnd] = useState<GameEndKind>(null);
  const streakRef = useRef<{ kind: GameEndKind; n: number }>({ kind: null, n: 0 });

  useEffect(() => {
    if (!video || !enabled) {
      setGameEnd(null);
      streakRef.current = { kind: null, n: 0 };
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const id = setInterval(() => {
      if (!ctx || !video.videoWidth || !video.videoHeight) return;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const kind = classifyEndFrame(ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data);

      const s = streakRef.current;
      if (kind === s.kind) s.n += 1;
      else streakRef.current = { kind, n: 1 };

      if (kind !== null && streakRef.current.n >= CONFIRM_COUNT) {
        setGameEnd(kind);
      } else if (kind === null) {
        setGameEnd(null); // 일반 화면 복귀 → 해제 (다음 게임 재무장)
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [video, enabled, intervalMs]);

  return gameEnd;
}
