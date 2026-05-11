// useCaptureSocket 훅 테스트 — socket.io-client mock 사용
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { SocketEvents } from '@pubg-helper/shared';
import type { CircleData } from '@pubg-helper/shared';

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// mock 등록 후 훅 import
const { useCaptureSocket } = await import('../hooks/useCaptureSocket');

function getHandler(event: string) {
  const call = mockSocket.on.mock.calls.find(([e]) => e === event);
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

describe('useCaptureSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태: circleData null, connected false', () => {
    const { result } = renderHook(() => useCaptureSocket());
    expect(result.current.circleData).toBeNull();
    expect(result.current.connected).toBe(false);
  });

  it('connect 이벤트 수신 시 connected가 true가 된다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    act(() => getHandler('connect')?.());
    expect(result.current.connected).toBe(true);
  });

  it('disconnect 이벤트 수신 시 connected가 false가 된다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    act(() => {
      getHandler('connect')?.();
      getHandler('disconnect')?.();
    });
    expect(result.current.connected).toBe(false);
  });

  it('circle:result 수신 시 circleData가 갱신된다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    const circle: CircleData = { x: 0.5, y: 0.5, r: 0.2 };
    act(() => getHandler(SocketEvents.CIRCLE_RESULT)?.(circle));
    expect(result.current.circleData).toEqual(circle);
  });

  it('circle:result 재수신 시 이전 원을 교체한다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    act(() => getHandler(SocketEvents.CIRCLE_RESULT)?.({ x: 0.3, y: 0.3, r: 0.1 }));
    const newCircle: CircleData = { x: 0.7, y: 0.7, r: 0.3 };
    act(() => getHandler(SocketEvents.CIRCLE_RESULT)?.(newCircle));
    expect(result.current.circleData).toEqual(newCircle);
  });

  it('map:none 수신 시 circleData가 null이 된다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    act(() => getHandler(SocketEvents.CIRCLE_RESULT)?.({ x: 0.5, y: 0.5, r: 0.2 }));
    act(() => getHandler(SocketEvents.NO_MAP)?.());
    expect(result.current.circleData).toBeNull();
  });

  it('disconnect 시 마지막 circleData가 유지된다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    const circle: CircleData = { x: 0.5, y: 0.5, r: 0.2 };
    act(() => getHandler(SocketEvents.CIRCLE_RESULT)?.(circle));
    act(() => getHandler('disconnect')?.());
    expect(result.current.circleData).toEqual(circle);
  });

  it('sendFrame 호출 시 socket.emit(frame:upload)이 실행된다', () => {
    const { result } = renderHook(() => useCaptureSocket());
    act(() => result.current.sendFrame('base64data'));
    expect(mockSocket.emit).toHaveBeenCalledWith(SocketEvents.FRAME_UPLOAD, 'base64data');
  });

  it('언마운트 시 socket.disconnect가 호출된다', () => {
    const { unmount } = renderHook(() => useCaptureSocket());
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
