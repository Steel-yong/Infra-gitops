// 클라이언트별 자기장 타이머 알림 임계값 추적 서비스
import { Injectable } from '@nestjs/common';
import type { TimerState } from '@pubg-helper/shared';

const ALERT_THRESHOLDS = [30, 20, 10] as const;

type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

interface ClientAlertState {
  notified: Set<AlertThreshold>;
  wasShrinking: boolean;
}

@Injectable()
export class TimerStateService {
  private readonly clientStates = new Map<string, ClientAlertState>();

  processTimerState(clientId: string, state: TimerState): string[] {
    if (!state || typeof state.remainingSeconds !== 'number' || typeof state.isShrinking !== 'boolean') {
      throw new Error('유효하지 않은 TimerState 형식');
    }

    const clientState = this.getOrCreateClientState(clientId);

    if (!state.isShrinking) {
      clientState.wasShrinking = false;
      return [];
    }

    // 새 자기장 수축 시작 시 알림 기록 초기화
    if (!clientState.wasShrinking) {
      clientState.notified.clear();
      clientState.wasShrinking = true;
    }

    const alerts: string[] = [];
    for (const threshold of ALERT_THRESHOLDS) {
      if (state.remainingSeconds <= threshold && !clientState.notified.has(threshold)) {
        clientState.notified.add(threshold);
        alerts.push(`alert-${threshold}`);
      }
    }

    return alerts;
  }

  removeClient(clientId: string): void {
    this.clientStates.delete(clientId);
  }

  private getOrCreateClientState(clientId: string): ClientAlertState {
    if (!this.clientStates.has(clientId)) {
      this.clientStates.set(clientId, { notified: new Set(), wasShrinking: false });
    }
    return this.clientStates.get(clientId)!;
  }
}
