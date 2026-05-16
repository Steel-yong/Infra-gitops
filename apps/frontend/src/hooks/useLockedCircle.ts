'use client';
// 자기장 원 위치를 한 번 락 후 고정하는 훅.
// Sticky 룰: 락 잡힌 후엔 절대 자동 해제 안 함. 다음 페이즈 검출이 들어오면 자동 갱신.
// 해제 경로: 1) 페이즈 전환(rawCircle.phase ≠ locked.phase), 2) 사용자 수동 unlock() 버튼.

import { useCallback, useEffect, useState } from 'react';
import type { CircleData } from '@pubg-helper/shared';

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
  //   - rawCircle null: 락 유지 (자동 해제 절대 안 함).
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

  const unlock = useCallback(() => {
    console.log('[Circle] 사용자 수동 락 해제 — 다음 유효 검출 채택 대기');
    setLocked(null);
  }, []);

  return { circle: locked, unlock };
}
