'use client';
// OCR 타이머 인식 결과를 사이드바에 표시하는 디버깅용 패널

import type { OcrTimerState } from '../hooks/useOcrTimer';
import styles from './TimerPanel.module.css';

interface TimerPanelProps {
  state: OcrTimerState;
  isCapturing: boolean;
}

/** "M:SS" 포맷으로 잔여 초를 표시. null이면 -- */
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

      <div className={styles.ocrDebug}>
        <div className={styles.ocrRow}>
          <span className={styles.ocrLabel}>OCR 인식:</span>
          <span className={styles.ocrValue}>
            {state.rawText ? `"${state.rawText}"` : '인식 없음'}
          </span>
        </div>
        <div className={styles.ocrRow}>
          <span className={styles.ocrLabel}>크롭 영역:</span>
          <span className={styles.ocrValue}>
            {state.region
              ? `${state.region.w}×${state.region.h} @(${state.region.x},${state.region.y})`
              : '-'}
          </span>
        </div>
        <div className={styles.ocrRow}>
          <span className={styles.ocrLabel}>시도 횟수:</span>
          <span className={styles.ocrValue}>{state.attempts}회</span>
        </div>
        {state.cropDataUrl && (
          <div className={styles.cropPreviewWrap}>
            <span className={styles.ocrLabel}>크롭 이미지:</span>
            <img
              src={state.cropDataUrl}
              alt="OCR 크롭 영역"
              className={styles.cropPreview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
