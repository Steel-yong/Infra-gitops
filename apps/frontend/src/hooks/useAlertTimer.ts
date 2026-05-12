// 자기장 타이머 알림 임계값 도달 감지 훅

import { useCallback, useRef, useState } from 'react';

export interface TimerDisplayState {
  remainingSeconds: number | null;
  isShrinking: boolean;
}

export interface UseAlertTimerConfig {
  /** 알림을 트리거할 잔여 초 목록 (예: [30, 20, 10]) */
  thresholds: number[];
  /** 임계값 도달 시 호출되는 콜백 */
  onAlert: (seconds: number) => void;
}

export interface UseAlertTimerReturn {
  /** 디스플레이용 현재 타이머 상태 */
  displayState: TimerDisplayState | null;
  /** OCR 파싱 결과를 처리해 알림 여부를 판단한다 */
  processState: (remainingSeconds: number | null, isShrinking: boolean) => void;
}

/**
 * 자기장 타이머 상태를 받아 설정된 임계값(30/20/10초) 도달 시 onAlert를 1회 호출한다.
 * isShrinking=false이면 알림 없이 타이머만 표시한다.
 * 타이머가 리셋되면 (잔여 초가 이전보다 증가) 발송 기록을 초기화한다.
 */
export function useAlertTimer({ thresholds, onAlert }: UseAlertTimerConfig): UseAlertTimerReturn {
  const [displayState, setDisplayState] = useState<TimerDisplayState | null>(null);
  const alertedRef = useRef<Set<number>>(new Set());
  const prevSecondsRef = useRef<number | null>(null);

  const processState = useCallback(
    (remainingSeconds: number | null, isShrinking: boolean) => {
      setDisplayState({ remainingSeconds, isShrinking });

      if (!isShrinking || remainingSeconds === null) return;

      if (prevSecondsRef.current !== null && remainingSeconds > prevSecondsRef.current) {
        alertedRef.current.clear();
      }
      prevSecondsRef.current = remainingSeconds;

      if (thresholds.includes(remainingSeconds) && !alertedRef.current.has(remainingSeconds)) {
        alertedRef.current.add(remainingSeconds);
        onAlert(remainingSeconds);
      }
    },
    [thresholds, onAlert],
  );

  return { displayState, processState };
}
