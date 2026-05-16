'use client';
// 자기장 원 위치를 한 번 락 후 고정하는 훅
// 락 해제: 1) 줄어듦 → 대기 전환, 2) capture가 N번 연속 미검출 (게임 화면 사라짐), 3) 사용자 수동 unlock()
// 락이 비어 있으면 isShrinking 상태 무관 다음 유효 검출을 락 (수동 재락 시 즉시 반영용).

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CircleData } from '@pubg-helper/shared';

export interface UseLockedCircleReturn {
  circle: CircleData | null;
  /** 사용자가 "자기장 다시 잡기" 트리거. 다음 유효 검출이 새 락으로 채택됨. */
  unlock: () => void;
}

/** capture가 N번 연속 미검출(rawCircle=null)이면 락 자동 해제.
 * frame 주기 약 100~300ms, N=15 = 약 1.5~4.5초 미검출 지속 시 해제. */
const AUTO_UNLOCK_NO_DETECT_COUNT = 15;

export function useLockedCircle(
  rawCircle: CircleData | null,
  isShrinking: boolean,
): UseLockedCircleReturn {
  const [locked, setLocked] = useState<CircleData | null>(null);
  const prevShrinkingRef = useRef(isShrinking);
  const noDetectCountRef = useRef(0);

  // 전환 감지: 줄어드는 중 → 대기 (다음 자기장 위치 새로 따야 할 시점)
  useEffect(() => {
    if (prevShrinkingRef.current && !isShrinking) {
      console.log('[Circle] 자기장 줄어듦 종료 → 대기 시작, 락 해제 (다음 위치 새로 검출)');
      setLocked(null);
    }
    prevShrinkingRef.current = isShrinking;
  }, [isShrinking]);

  // 락이 비어 있으면 유효 검출(score 임계값 통과한 capture 결과)을 락에 채택.
  // 페이즈 전환(예: 페이즈 1 → 2) 감지 시 즉시 새 락으로 갱신.
  // 미검출 연속이면 락 자동 해제 (게임 화면 사라짐 또는 잘못 잡힌 락 회복).
  useEffect(() => {
    if (rawCircle !== null) {
      noDetectCountRef.current = 0;
      if (locked === null) {
        console.log(
          `[Circle] 새 위치 락: x=${rawCircle.x.toFixed(3)}, y=${rawCircle.y.toFixed(3)}, r=${rawCircle.r.toFixed(3)}, phase=${rawCircle.phase}`,
        );
        setLocked(rawCircle);
      } else if (rawCircle.phase !== locked.phase) {
        console.log(
          `[Circle] 페이즈 전환 감지 ${locked.phase} → ${rawCircle.phase} — 즉시 새 락`,
        );
        setLocked(rawCircle);
      }
    } else {
      noDetectCountRef.current += 1;
      if (noDetectCountRef.current >= AUTO_UNLOCK_NO_DETECT_COUNT && locked !== null) {
        console.log(`[Circle] ${AUTO_UNLOCK_NO_DETECT_COUNT}번 연속 미검출 — 락 자동 해제`);
        setLocked(null);
      }
    }
  }, [rawCircle, locked]);

  const unlock = useCallback(() => {
    console.log('[Circle] 사용자 수동 락 해제 — 다음 유효 검출 채택 대기');
    noDetectCountRef.current = 0;
    setLocked(null);
  }, []);

  return { circle: locked, unlock };
}
