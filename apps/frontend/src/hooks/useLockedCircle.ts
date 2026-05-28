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
// 첫 락(또는 unlock 직후 재락): 같은 페이즈 + 같은 위치(5% 드리프트 내)가 이 횟수만큼 연속이어야 채택.
// 게임화면에 청록 잠깐 튀어 capture가 가짜 원 잡아도 위치 안 안정해서 streak 통과 못 함 → 자동 재락 차단.
const FRESH_LOCK_STREAK = 3;
const FRESH_LOCK_POS_TOL = 0.05;

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
  // unlock 직후 streak — 같은 페이즈+같은 위치 연속 카운트 (단발 false-positive 자동 재락 차단).
  // 초기 마운트 시엔 false라 첫 검출 즉시 락(사용자 기대: 맵 열면 바로 락).
  const requireFreshStreakRef = useRef(false);
  const freshStreakRef = useRef<{ phase: number; x: number; y: number; n: number }>({ phase: -1, x: 0, y: 0, n: 0 });

  // 락 채택 룰 (Sticky):
  //   - 락 없음: 같은 페이즈+같은 위치(드리프트 5% 내)가 FRESH_LOCK_STREAK회 연속이어야 채택.
  //     (게임화면에 우연히 잡힌 가짜 원은 위치가 안 안정해서 streak 통과 못 함 → 자동 재락 차단.)
  //   - 더 높은 페이즈: 갱신 (자기장 페이즈는 한 게임 안에선 한 방향으로만 진행).
  //   - 더 낮은 페이즈: 연속 NEW_GAME_STREAK회면 새 게임으로 보고 재락, 아니면 무시(OCR 깜빡임).
  //   - 같은 페이즈: 무시 (위치 안정성 유지).
  //   - rawCircle null: 락 유지 (자동 해제 안 함 — 해제는 게임종료/수동 버튼만).
  useEffect(() => {
    if (rawCircle === null) return;
    if (locked === null) {
      // 초기 마운트면 즉시 락. unlock 직후라면 streak 통과해야 락(false-positive 차단).
      if (!requireFreshStreakRef.current) {
        lowerPhaseStreakRef.current = 0;
        setLocked(rawCircle);
        return;
      }
      const ref = freshStreakRef.current;
      const samePhase = ref.phase === rawCircle.phase;
      const drift = Math.hypot(ref.x - rawCircle.x, ref.y - rawCircle.y);
      if (samePhase && drift < FRESH_LOCK_POS_TOL) {
        ref.n += 1;
      } else {
        ref.phase = rawCircle.phase;
        ref.x = rawCircle.x;
        ref.y = rawCircle.y;
        ref.n = 1;
      }
      if (ref.n >= FRESH_LOCK_STREAK) {
        ref.n = 0;
        lowerPhaseStreakRef.current = 0;
        setLocked(rawCircle);
      }
      return;
    }
    if (rawCircle.phase > locked.phase) {
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
    freshStreakRef.current = { phase: -1, x: 0, y: 0, n: 0 };
    requireFreshStreakRef.current = true; // 다음 락은 streak 통과 필요(가짜 자동 재락 차단).
    setLocked(null);
  }, []);

  return { circle: locked, unlock };
}
