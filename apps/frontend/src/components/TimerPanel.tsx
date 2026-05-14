'use client';
// OCR로 인식한 자기장 타이머 잔여 시간을 사이드바에 표시하는 컴포넌트

import type { OcrTimerState } from '../hooks/useOcrTimer';
import styles from './TimerPanel.module.css';

interface TimerPanelProps {
  state: OcrTimerState;
  isCapturing: boolean;
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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

  if (state.status === 'loading') {
    return (
      <div className={styles.panel}>
        <p className={styles.sectionLabel}>자기장 타이머</p>
        <p className={styles.idleMsg}>OCR 엔진 다운로드 중... (최초 1회, 수십 초 소요)</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={styles.panel}>
        <p className={styles.sectionLabel}>자기장 타이머</p>
        <p className={styles.errorMsg}>
          OCR 실패: {state.errorMessage ?? '알 수 없는 에러'}
        </p>
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
          <div className={styles.timerLabel}>
            {state.isShrinking ? '자기장이 줄어들고 있습니다.' : '이동까지 남은시간'}
          </div>
        </div>
      </div>

      {/* OCR 디버그 — 크롭 영역이 PUBG 타이머와 일치하는지 시각 확인 */}
      {state.cropDataUrl && state.region && (
        <div className={styles.cropDebug}>
          <p className={styles.cropLabel}>
            OCR 크롭 영역 ({state.region.w}×{state.region.h} @ {state.region.x},{state.region.y})
          </p>
          <img src={state.cropDataUrl} alt="OCR 크롭" className={styles.cropImg} />
          <p className={styles.cropText}>
            인식: <code>{state.rawText || '(빈 문자열)'}</code>
          </p>
        </div>
      )}
    </div>
  );
}
