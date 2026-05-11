// useWebNotifications 훅 테스트 — Notification API mock 사용
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebNotifications } from '../hooks/useWebNotifications';

const mockNotification = vi.fn();
const mockRequestPermission = vi.fn();

function setupNotification(permission: NotificationPermission) {
  Object.defineProperty(global, 'Notification', {
    value: Object.assign(mockNotification, {
      permission,
      requestPermission: mockRequestPermission,
    }),
    writable: true,
    configurable: true,
  });
}

describe('useWebNotifications', () => {
  beforeEach(() => {
    mockNotification.mockClear();
    mockRequestPermission.mockClear();
    setupNotification('default');
  });

  it('초기 permission은 Notification.permission 값이다', () => {
    setupNotification('granted');
    const { result } = renderHook(() => useWebNotifications());
    expect(result.current.permission).toBe('granted');
  });

  it('requestPermission 호출 시 permission 상태가 갱신된다', async () => {
    mockRequestPermission.mockResolvedValue('granted');
    const { result } = renderHook(() => useWebNotifications());
    await act(async () => {
      await result.current.requestPermission();
    });
    expect(result.current.permission).toBe('granted');
  });

  it('권한 granted + 임계값 도달 시 Notification을 발송한다', () => {
    setupNotification('granted');
    const { result } = renderHook(() => useWebNotifications());
    act(() => result.current.trigger(30, [30, 20, 10]));
    expect(mockNotification).toHaveBeenCalledWith('자기장 알림', expect.objectContaining({ body: expect.stringContaining('30초') }));
  });

  it('동일 임계값에 2번 trigger해도 알림은 1회만 발송한다', () => {
    setupNotification('granted');
    const { result } = renderHook(() => useWebNotifications());
    act(() => {
      result.current.trigger(30, [30]);
      result.current.trigger(30, [30]);
    });
    expect(mockNotification).toHaveBeenCalledTimes(1);
  });

  it('권한 denied이면 알림을 발송하지 않는다', () => {
    setupNotification('denied');
    const { result } = renderHook(() => useWebNotifications());
    act(() => result.current.trigger(30, [30]));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('활성화되지 않은 임계값에는 알림을 발송하지 않는다', () => {
    setupNotification('granted');
    const { result } = renderHook(() => useWebNotifications());
    act(() => result.current.trigger(20, [30, 10]));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('타이머가 최대 임계값보다 크면 발송 기록을 초기화한다', () => {
    setupNotification('granted');
    const { result } = renderHook(() => useWebNotifications());
    act(() => result.current.trigger(30, [30]));
    expect(mockNotification).toHaveBeenCalledTimes(1);
    act(() => result.current.trigger(90, [30]));
    act(() => result.current.trigger(30, [30]));
    expect(mockNotification).toHaveBeenCalledTimes(2);
  });

  it('enabledThresholds가 비어있으면 알림을 발송하지 않는다', () => {
    setupNotification('granted');
    const { result } = renderHook(() => useWebNotifications());
    act(() => result.current.trigger(30, []));
    expect(mockNotification).not.toHaveBeenCalled();
  });
});
