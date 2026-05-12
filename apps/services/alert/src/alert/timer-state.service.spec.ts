// TimerStateService 단위 테스트 — 임계값 알림 트리거 + 중복 방지
import { describe, it, expect, beforeEach } from 'vitest';
import { TimerStateService } from './timer-state.service';

describe('TimerStateService', () => {
  let service: TimerStateService;
  const CLIENT_ID = 'client-test-01';

  beforeEach(() => {
    service = new TimerStateService();
  });

  it('서비스가 정의된다', () => {
    expect(service).toBeDefined();
  });

  it('isShrinking: true + remainingSeconds 30 → alert-30 반환', () => {
    const alerts = service.processTimerState(CLIENT_ID, {
      remainingSeconds: 30,
      isShrinking: true,
      phase: 1,
    });
    expect(alerts).toContain('alert-30');
  });

  it('isShrinking: false → 알림 없음', () => {
    const alerts = service.processTimerState(CLIENT_ID, {
      remainingSeconds: 10,
      isShrinking: false,
      phase: 1,
    });
    expect(alerts).toHaveLength(0);
  });

  it('같은 세션에서 30초 임계값 재진입 시 재발송 없음 (중복 방지)', () => {
    service.processTimerState(CLIENT_ID, { remainingSeconds: 30, isShrinking: true, phase: 1 });
    const secondAlerts = service.processTimerState(CLIENT_ID, {
      remainingSeconds: 29,
      isShrinking: true,
      phase: 1,
    });
    expect(secondAlerts).not.toContain('alert-30');
  });

  it('isShrinking false → true 전환 시 알림 기록 초기화 → 다시 발송됨', () => {
    service.processTimerState(CLIENT_ID, { remainingSeconds: 30, isShrinking: true, phase: 1 });
    service.processTimerState(CLIENT_ID, { remainingSeconds: 60, isShrinking: false, phase: 1 });
    const alerts = service.processTimerState(CLIENT_ID, {
      remainingSeconds: 30,
      isShrinking: true,
      phase: 2,
    });
    expect(alerts).toContain('alert-30');
  });

  it('remainingSeconds 10 → alert-30, alert-20, alert-10 모두 반환', () => {
    const alerts = service.processTimerState(CLIENT_ID, {
      remainingSeconds: 10,
      isShrinking: true,
      phase: 1,
    });
    expect(alerts).toContain('alert-30');
    expect(alerts).toContain('alert-20');
    expect(alerts).toContain('alert-10');
  });

  it('removeClient: 클라이언트 상태 삭제 후 알림 기록 초기화됨', () => {
    service.processTimerState(CLIENT_ID, { remainingSeconds: 30, isShrinking: true, phase: 1 });
    service.removeClient(CLIENT_ID);
    const alerts = service.processTimerState(CLIENT_ID, {
      remainingSeconds: 30,
      isShrinking: true,
      phase: 1,
    });
    expect(alerts).toContain('alert-30');
  });

  it('유효하지 않은 TimerState → 에러 throw', () => {
    expect(() =>
      service.processTimerState(CLIENT_ID, null as unknown as { remainingSeconds: number; isShrinking: boolean; phase: number }),
    ).toThrow('유효하지 않은 TimerState 형식');
  });

  it('여러 클라이언트는 독립적으로 상태 관리', () => {
    service.processTimerState('client-A', { remainingSeconds: 30, isShrinking: true, phase: 1 });
    const alertsB = service.processTimerState('client-B', {
      remainingSeconds: 30,
      isShrinking: true,
      phase: 1,
    });
    expect(alertsB).toContain('alert-30');
  });
});
