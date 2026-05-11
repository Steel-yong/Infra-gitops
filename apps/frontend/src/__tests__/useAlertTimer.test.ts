// useAlertTimer 훅 단위 테스트

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlertTimer } from '../hooks/useAlertTimer';

describe('useAlertTimer', () => {
  let onAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAlert = vi.fn();
  });

  it('초기 displayState는 null이다', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    expect(result.current.displayState).toBeNull();
  });

  it('processState 호출 후 displayState가 갱신된다', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(98, false));
    expect(result.current.displayState).toEqual({ remainingSeconds: 98, isShrinking: false });
  });

  it('isShrinking=false이면 임계값 도달해도 알림 발송 안 함', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(30, false));
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('isShrinking=true + 임계값 도달 시 onAlert 호출', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(30, true));
    expect(onAlert).toHaveBeenCalledWith(30);
    expect(onAlert).toHaveBeenCalledTimes(1);
  });

  it('동일 초에 여러 프레임 처리 시 알림 1회만 발송', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [10], onAlert }),
    );
    act(() => {
      result.current.processState(10, true);
      result.current.processState(10, true);
      result.current.processState(10, true);
    });
    expect(onAlert).toHaveBeenCalledTimes(1);
  });

  it('remainingSeconds=null이면 알림 발송 안 함', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(null, true));
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('임계값에 없는 초 → 알림 발송 안 함', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(25, true));
    expect(onAlert).not.toHaveBeenCalled();
  });

  it('타이머 리셋(초 증가) 후 같은 임계값에 다시 알림 발송', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30], onAlert }),
    );
    // 첫 번째 30초 알림
    act(() => result.current.processState(30, true));
    expect(onAlert).toHaveBeenCalledTimes(1);

    // 타이머 리셋 (초가 증가 = 새 자기장 시작)
    act(() => result.current.processState(120, true));

    // 두 번째 30초 알림 → 기록 초기화되었으므로 재발송
    act(() => result.current.processState(30, true));
    expect(onAlert).toHaveBeenCalledTimes(2);
  });

  it('30/20/10초 각각 임계값마다 알림 1회씩 발송', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => {
      result.current.processState(30, true);
      result.current.processState(20, true);
      result.current.processState(10, true);
    });
    expect(onAlert).toHaveBeenCalledTimes(3);
    expect(onAlert).toHaveBeenNthCalledWith(1, 30);
    expect(onAlert).toHaveBeenNthCalledWith(2, 20);
    expect(onAlert).toHaveBeenNthCalledWith(3, 10);
  });

  it('"0:10" + 느낌표 있음 → 10초 알림 1회 트리거', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(10, true));
    expect(onAlert).toHaveBeenCalledWith(10);
    expect(onAlert).toHaveBeenCalledTimes(1);
  });

  it('isShrinking=false → displayState.isShrinking도 false로 갱신', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(98, false));
    expect(result.current.displayState?.isShrinking).toBe(false);
  });

  it('isShrinking=true → displayState.isShrinking도 true로 갱신', () => {
    const { result } = renderHook(() =>
      useAlertTimer({ thresholds: [30, 20, 10], onAlert }),
    );
    act(() => result.current.processState(30, true));
    expect(result.current.displayState?.isShrinking).toBe(true);
  });
});
