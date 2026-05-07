// useScreenCapture 훅 단위 테스트

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScreenCapture } from '../hooks/useScreenCapture';

// Worker mock
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  private messages: unknown[] = [];

  postMessage(msg: unknown): void {
    this.messages.push(msg);
  }

  terminate(): void {}

  // 테스트에서 워커 응답을 시뮬레이션
  simulateMessage(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

let mockWorkerInstance: MockWorker | null = null;

vi.mock('../workers/captureWorker', () => ({}));

beforeEach(() => {
  mockWorkerInstance = new MockWorker();
  vi.stubGlobal(
    'Worker',
    vi.fn().mockImplementation(() => {
      return mockWorkerInstance;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeMockStream(): MediaStream {
  const track = {
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaStreamTrack;
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
}

describe('useScreenCapture', () => {
  it('초기 상태에서 isCapturing은 false다', () => {
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn() }),
    );
    expect(result.current.isCapturing).toBe(false);
  });

  it('start() 호출 후 isCapturing이 true가 된다', async () => {
    const mockStream = makeMockStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isCapturing).toBe(true);
  });

  it('stop() 호출 후 isCapturing이 false가 된다', async () => {
    const mockStream = makeMockStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn() }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isCapturing).toBe(false);
  });

  it('getDisplayMedia 실패 시 onError가 호출된다', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn(), onError }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(onError).toHaveBeenCalledWith('NotAllowedError');
    expect(result.current.isCapturing).toBe(false);
  });

  it('워커에서 FRAME 메시지 수신 시 onFrame이 호출된다', async () => {
    const mockStream = makeMockStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    const onFrame = vi.fn();
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      mockWorkerInstance?.simulateMessage({ type: 'FRAME', data: 'base64data' });
    });

    expect(onFrame).toHaveBeenCalledWith('base64data');
  });

  it('getDisplayMedia가 Error가 아닌 값을 throw하면 기본 메시지로 onError가 호출된다', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockRejectedValue('string-rejection'),
      },
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn(), onError }),
    );

    await act(async () => {
      await result.current.start();
    });

    expect(onError).toHaveBeenCalledWith('화면공유 권한 거부');
  });

  it('워커에서 ERROR 메시지 수신 시 onError가 호출된다', async () => {
    const mockStream = makeMockStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn(), onError }),
    );

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      mockWorkerInstance?.simulateMessage({ type: 'ERROR', message: '캡처 실패' });
    });

    expect(onError).toHaveBeenCalledWith('캡처 실패');
  });
});
