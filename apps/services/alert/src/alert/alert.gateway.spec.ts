// AlertGateway 단위 테스트 — timer-state 수신 + alert 이벤트 emit
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AlertGateway } from './alert.gateway';
import { TimerStateService } from './timer-state.service';

const mockTimerStateService = {
  processTimerState: vi.fn(),
  removeClient: vi.fn(),
};

const mockClient = {
  id: 'socket-client-01',
  emit: vi.fn(),
};

describe('AlertGateway', () => {
  let gateway: AlertGateway;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertGateway,
        { provide: TimerStateService, useValue: mockTimerStateService },
      ],
    }).compile();
    gateway = module.get<AlertGateway>(AlertGateway);
  });

  it('게이트웨이가 정의된다', () => {
    expect(gateway).toBeDefined();
  });

  it('alert-30 이벤트를 클라이언트에게 emit한다', () => {
    mockTimerStateService.processTimerState.mockReturnValue(['alert-30']);

    gateway.handleTimerState(
      mockClient as never,
      { remainingSeconds: 30, isShrinking: true, phase: 1 },
    );

    expect(mockClient.emit).toHaveBeenCalledWith('alert-30');
  });

  it('알림이 없으면 emit을 호출하지 않는다', () => {
    mockTimerStateService.processTimerState.mockReturnValue([]);

    gateway.handleTimerState(
      mockClient as never,
      { remainingSeconds: 60, isShrinking: false, phase: 1 },
    );

    expect(mockClient.emit).not.toHaveBeenCalled();
  });

  it('유효하지 않은 TimerState → error 이벤트 emit', () => {
    mockTimerStateService.processTimerState.mockImplementation(() => {
      throw new Error('유효하지 않은 TimerState 형식');
    });

    gateway.handleTimerState(mockClient as never, null as never);

    expect(mockClient.emit).toHaveBeenCalledWith('error', {
      message: '유효하지 않은 TimerState 형식',
    });
  });

  it('handleDisconnect 호출 시 클라이언트 상태 삭제', () => {
    gateway.handleDisconnect(mockClient as never);
    expect(mockTimerStateService.removeClient).toHaveBeenCalledWith('socket-client-01');
  });

  it('여러 alert 이벤트를 순서대로 emit한다', () => {
    mockTimerStateService.processTimerState.mockReturnValue(['alert-30', 'alert-20', 'alert-10']);

    gateway.handleTimerState(
      mockClient as never,
      { remainingSeconds: 10, isShrinking: true, phase: 1 },
    );

    expect(mockClient.emit).toHaveBeenCalledTimes(3);
    expect(mockClient.emit).toHaveBeenNthCalledWith(1, 'alert-30');
    expect(mockClient.emit).toHaveBeenNthCalledWith(2, 'alert-20');
    expect(mockClient.emit).toHaveBeenNthCalledWith(3, 'alert-10');
  });
});
