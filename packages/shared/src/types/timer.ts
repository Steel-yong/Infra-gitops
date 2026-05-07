// 자기장 타이머 상태 타입

export interface TimerState {
  /** 자기장 잔여 시간 (초) */
  remainingSeconds: number;
  /** 자기장이 줄어드는 중이면 true, 다음 자기장 대기 중이면 false */
  isShrinking: boolean;
  /** 현재 자기장 Phase 번호 (1부터 시작) */
  phase: number;
}
