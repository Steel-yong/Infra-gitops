// 자기장 타이머 알림 임계값 도달 감지 훅
// 자기장 줄어들기 시작 전(isShrinking=false) 카운트다운 중 임계값 도달 시 알림.
// 이미 줄어드는 중(isShrinking=true)이면 알림 안 함 — 이미 늦었으니 의미 없음.

import { useCallback, useRef, useState } from 'react';

export interface TimerDisplayState {
  remainingSeconds: number | null;
  isShrinking: boolean;
}

export interface UseAlertTimerConfig {
  /** 알림을 트리거할 잔여 초 목록 (예: [30, 20, 10]) */
  thresholds: number[];
  /** 임계값 도달 시 호출되는 콜백. seconds는 사용자가 본 임계값(예: 30) */
  onAlert: (seconds: number) => void;
  /**
   * 화면공유 캡처 지연 보상 (초). 임계값 + lead 시점에 알림이 발생.
   * 예: thresholds=[30], leadSeconds=1 → 잔여 31초 시점에 알림 (메시지는 "30초").
   */
  leadSeconds?: number;
}

export interface UseAlertTimerReturn {
  displayState: TimerDisplayState | null;
  processState: (remainingSeconds: number | null, isShrinking: boolean) => void;
}

/**
 * isShrinking=false (대기 중)일 때만 알림 처리.
 * 임계값+leadSeconds 시점에 도달하면 사용자 임계값을 콜백으로 전달.
 * 타이머가 리셋되면(잔여 초가 이전보다 증가) 발송 기록 초기화.
 */
export function useAlertTimer({
  thresholds,
  onAlert,
  leadSeconds = 0,
}: UseAlertTimerConfig): UseAlertTimerReturn {
  const [displayState, setDisplayState] = useState<TimerDisplayState | null>(null);
  const alertedRef = useRef<Set<number>>(new Set());
  const prevSecondsRef = useRef<number | null>(null);

  const processState = useCallback(
    (remainingSeconds: number | null, isShrinking: boolean) => {
      // 같은 값이면 re-render 안 일으킴 (부모의 새 콜백 → re-render → 무한 루프 방지)
      setDisplayState((prev) => {
        if (
          prev !== null &&
          prev.remainingSeconds === remainingSeconds &&
          prev.isShrinking === isShrinking
        ) {
          return prev;
        }
        return { remainingSeconds, isShrinking };
      });

      // 이미 줄어드는 중이면 알림 없음. 또는 데이터 없으면 스킵.
      if (isShrinking || remainingSeconds === null) return;

      // 새 페이즈 진입 (잔여 초 증가) → 발송 기록 초기화
      if (prevSecondsRef.current !== null && remainingSeconds > prevSecondsRef.current) {
        alertedRef.current.clear();
      }
      prevSecondsRef.current = remainingSeconds;

      // 사용자 임계값 + leadSeconds 시점에 발송 → 메시지는 원래 임계값으로
      for (const userThreshold of thresholds) {
        const triggerAt = userThreshold + leadSeconds;
        if (remainingSeconds === triggerAt && !alertedRef.current.has(userThreshold)) {
          alertedRef.current.add(userThreshold);
          onAlert(userThreshold);
        }
      }
    },
    [thresholds, onAlert, leadSeconds],
  );

  return { displayState, processState };
}
