'use client';
// 자기장 원 위치를 한 번 락 후 고정하는 훅.
// Sticky 룰: 락 잡힌 후 미검출엔 계속 유지, 페이즈가 진행할 때만 갱신, 새 게임이면 재락.
// 해제/갱신 경로:
//   1) 페이즈 진행(rawCircle.phase > locked.phase): 즉시 새 락으로 갱신.
//   2) 낮은 페이즈가 NEW_GAME_STREAK회 연속: 새 게임으로 보고 재락 (게임종료 감지가 놓쳐도 자가복구).
//   3) 사용자 수동 unlock() 버튼("자기장 다시 잡기").
//   4) 게임 종료 감지(치킨/사망)는 page.tsx가 unlock() 호출 — 이 훅 밖.
// ※ 자동 시간만료(stale) 해제는 두지 않는다 — 맵을 닫아둔 정상 플레이에서 락이 사라지는 오발 방지.
//   단발성 낮은 페이즈(OCR 깜빡임)는 무시하고, 연속일 때만 새 게임으로 판정해 락 튐을 막는다.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CircleData } from '@pubg-helper/shared';

// 락보다 낮은 페이즈가 이 횟수만큼 연속 검출되면 새 게임으로 보고 재락 (OCR 깜빡임과 구분).
const NEW_GAME_STREAK = 5;

export interface UseLockedCircleReturn {
  circle: CircleData | null;
  /** 사용자가 "자기장 다시 잡기" 트리거. 다음 유효 검출이 새 락으로 채택됨. */
  unlock: () => void;
}

export function useLockedCircle(
  rawCircle: CircleData | null,
): UseLockedCircleReturn {
  const [locked, setLocked] = useState<CircleData | null>(null);
  // 락보다 낮은 페이즈가 연속으로 들어온 횟수 (새 게임 판정용).
  const lowerPhaseStreakRef = useRef(0);

  // 락 채택 룰 (Sticky):
  //   - 락 없음: 새 락.
  //   - 더 높은 페이즈: 갱신 (자기장 페이즈는 한 게임 안에선 한 방향으로만 진행).
  //   - 더 낮은 페이즈: 연속 NEW_GAME_STREAK회면 새 게임으로 보고 재락, 아니면 무시(OCR 깜빡임).
  //   - 같은 페이즈: 무시 (위치 안정성 유지).
  //   - rawCircle null: 락 유지 (자동 해제 안 함 — 해제는 게임종료/수동 버튼만).
  useEffect(() => {
    if (rawCircle === null) return;
    if (locked === null) {
      lowerPhaseStreakRef.current = 0;
      setLocked(rawCircle);
    } else if (rawCircle.phase > locked.phase) {
      lowerPhaseStreakRef.current = 0;
      setLocked(rawCircle);
    } else if (rawCircle.phase < locked.phase) {
      lowerPhaseStreakRef.current += 1;
      if (lowerPhaseStreakRef.current >= NEW_GAME_STREAK) {
        lowerPhaseStreakRef.current = 0;
        setLocked(rawCircle);
      }
    } else {
      lowerPhaseStreakRef.current = 0;
    }
  }, [rawCircle, locked]);

  const unlock = useCallback(() => {
    lowerPhaseStreakRef.current = 0;
    setLocked(null);
  }, []);

  return { circle: locked, unlock };
}
