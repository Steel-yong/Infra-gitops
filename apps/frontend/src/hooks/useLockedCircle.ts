'use client';
// 자기장 원 위치를 "줄어듦 → 대기" 전환 시점에만 갱신하고 그 외엔 고정하는 훅
// 매 프레임마다 미세하게 흔들리는 검출 결과를 안정화한다.

import { useEffect, useRef, useState } from 'react';
import type { CircleData } from '@pubg-helper/shared';

/**
 * isShrinking 전환 감지:
 *   - true → false (대기 시작) 순간에 잠금 해제 → 다음 유효 검출을 새 락으로 채택
 *   - 그 외에는 기존 락 유지 (대기 중 위치 고정)
 * 초기 상태: 락 없음 → 첫 유효 검출을 락 (대기 중일 때만)
 */
export function useLockedCircle(
  rawCircle: CircleData | null,
  isShrinking: boolean,
): CircleData | null {
  const [locked, setLocked] = useState<CircleData | null>(null);
  const prevShrinkingRef = useRef(isShrinking);

  // 전환 감지: 줄어드는 중 → 대기 (다음 자기장 위치 새로 따야 할 시점)
  useEffect(() => {
    if (prevShrinkingRef.current && !isShrinking) {
      console.log('[Circle] 자기장 줄어듦 종료 → 대기 시작, 락 해제 (다음 위치 새로 검출)');
      setLocked(null);
    }
    prevShrinkingRef.current = isShrinking;
  }, [isShrinking]);

  // 락이 비어 있고 대기 중이며 유효 검출이 들어오면 락
  useEffect(() => {
    if (locked === null && rawCircle !== null && !isShrinking) {
      console.log(
        `[Circle] 새 위치 락: x=${rawCircle.x.toFixed(3)}, y=${rawCircle.y.toFixed(3)}, r=${rawCircle.r.toFixed(3)}`,
      );
      setLocked(rawCircle);
    }
  }, [rawCircle, locked, isShrinking]);

  return locked;
}
