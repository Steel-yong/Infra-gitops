'use client';
// OCR로 인식한 자기장 타이머 잔여 시간을 사이드바에 표시하는 컴포넌트

import type { OcrTimerState } from '../hooks/useOcrTimer';
import styles from './TimerPanel.module.css';

interface TimerPanelProps {
  state: OcrTimerState;
  isCapturing: boolean;
}

/** 잔여 초를 "M:SS" 포맷으로 변환. null이면 "--:--" */
function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 잔여 초 임계값에 따라 색상 클래스 결정 */
function timerColorClass(remaining: number | null): string {
  if (remaining === null) return styles.timerNeutral;
  if (remaining <= 30) return styles.timerDanger;
  if (remaining <= 60) return styles.timerWarning;
  return styles.timerNormal;
}

export function TimerPanel({ state, isCapturing }: TimerPanelProps) {
  if (!isCapturing) {
    return (
      <div className={styles.panel}>
        <p className={styles.sectionLabel}>자기장 타이머</p>
        <p className={styles.idleMsg}>화면공유 시작 후 OCR 인식이 시작됩니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <p className={styles.sectionLabel}>자기장 타이머</p>

      <div className={styles.stateBadge}>
        {state.isShrinking ? (
          <span className={`${styles.badge} ${styles.badgeShrinking}`}>⚡ 줄어드는 중</span>
        ) : (
          <span className={`${styles.badge} ${styles.badgeWaiting}`}>⌛ 대기 중</span>
        )}
      </div>

      <div className={styles.timerDisplay}>
        <span className={styles.timerIcon}>⏱</span>
        <div>
          <div className={`${styles.timerTime} ${timerColorClass(state.remainingSeconds)}`}>
            {formatSeconds(state.remainingSeconds)}
          </div>
          <div className={styles.timerLabel}>다음 자기장까지</div>
        </div>
      </div>
    </div>
  );
}
