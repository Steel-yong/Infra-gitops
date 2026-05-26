'use client';
// 자기장 원 위치를 한 번 락 후 고정하는 훅.
// Sticky 룰: 락 잡힌 후 짧은 미검출엔 유지, 다음 페이즈 검출이 들어오면 자동 갱신.
// 해제 경로: 1) 페이즈 전환(rawCircle.phase ≠ locked.phase), 2) 사용자 수동 unlock() 버튼,
//          3) STALE_MS 이상 유효 검출이 끊기면 stale expire(사망·관전 후 자기장 제거).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CircleData } from '@pubg-helper/shared';

// 마지막 유효 검출 이후 이 시간(ms) 동안 검출이 없으면 락 해제 (사망·관전 시 stale 자기장 제거).
// 파밍 중 짧은 맵 닫힘은 살아남도록 충분히 길게 둔다.
const STALE_MS = 30000;

export interface UseLockedCircleReturn {
  circle: CircleData | null;
  /** 사용자가 "자기장 다시 잡기" 트리거. 다음 유효 검출이 새 락으로 채택됨. */
  unlock: () => void;
}

export function useLockedCircle(
  rawCircle: CircleData | null,
): UseLockedCircleReturn {
  const [locked, setLocked] = useState<CircleData | null>(null);

  // 락 채택 룰 (Sticky):
  //   - rawCircle 검출 성공 + 락 없음: 새 락.
  //   - rawCircle 검출 성공 + 락 있음 + 다른 페이즈: 즉시 갱신.
  //   - rawCircle 검출 성공 + 락 있음 + 같은 페이즈: 무시 (위치 안정성 유지).
  //   - rawCircle null: 락 유지 (단, STALE_MS 이상 지속되면 아래 stale expire로 해제).
  useEffect(() => {
    if (rawCircle === null) return;
    if (locked === null) {
      console.log(
        `[Circle] 새 위치 락: x=${rawCircle.x.toFixed(3)}, y=${rawCircle.y.toFixed(3)}, r=${rawCircle.r.toFixed(3)}, phase=${rawCircle.phase}`,
      );
      setLocked(rawCircle);
    } else if (rawCircle.phase !== locked.phase) {
      console.log(
        `[Circle] 페이즈 전환 ${locked.phase} → ${rawCircle.phase} — 즉시 새 락`,
      );
      setLocked(rawCircle);
    }
  }, [rawCircle, locked]);

  // 마지막 유효 검출 시각 추적.
  const lastSeenRef = useRef<number>(Date.now());
  useEffect(() => {
    if (rawCircle !== null) lastSeenRef.current = Date.now();
  }, [rawCircle]);

  // Stale expire: ③(맵 미개방)이 STALE_MS 이상 지속되면 락 해제 — 사망·관전 후 자기장이 남지 않게.
  useEffect(() => {
    if (locked === null) return;
    const id = setInterval(() => {
      if (Date.now() - lastSeenRef.current > STALE_MS) {
        console.log('[Circle] 장기 미검출 — 자기장 만료(stale clear)');
        setLocked(null);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [locked]);

  const unlock = useCallback(() => {
    console.log('[Circle] 사용자 수동 락 해제 — 다음 유효 검출 채택 대기');
    setLocked(null);
  }, []);

  return { circle: locked, unlock };
}
