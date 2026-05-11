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

class MockImageCapture {
  constructor(_track: MediaStreamTrack) {}
  async grabFrame(): Promise<ImageBitmap> {
    return { width: 100, height: 100, close: vi.fn() } as unknown as ImageBitmap;
  }
}

vi.mock('../workers/captureWorker', () => ({}));

beforeEach(() => {
  mockWorkerInstance = new MockWorker();
  vi.stubGlobal(
    'Worker',
    vi.fn().mockImplementation(() => {
      return mockWorkerInstance;
    }),
  );
  vi.stubGlobal('ImageCapture', MockImageCapture);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    'data:image/jpeg;base64,dGVzdA==',
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
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

  it('500ms 인터벌 후 grabFrame 결과가 onFrame으로 전달된다', async () => {
    vi.useFakeTimers();
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(onFrame).toHaveBeenCalledWith('dGVzdA==');
  });

  it('navigator.mediaDevices가 없으면 HTTPS 안내 메시지로 onError가 호출된다', async () => {
    vi.stubGlobal('navigator', { mediaDevices: null });
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn(), onError }),
    );
    await act(async () => {
      await result.current.start();
    });
    expect(onError).toHaveBeenCalledWith('화면공유는 localhost 또는 HTTPS 환경에서만 사용 가능합니다.');
  });

  it('비디오 트랙 없는 스트림이면 "비디오 트랙 없음"으로 onError가 호출된다', async () => {
    const emptyStream = {
      getVideoTracks: () => [] as unknown as MediaStreamTrack[],
      getTracks: () => [],
    } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: vi.fn().mockResolvedValue(emptyStream),
      },
    });
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useScreenCapture({ onFrame: vi.fn(), onError }),
    );
    await act(async () => {
      await result.current.start();
    });
    expect(onError).toHaveBeenCalledWith('비디오 트랙 없음');
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

  it('canvas getContext가 null이면 onFrame이 호출되지 않는다', async () => {
    vi.useFakeTimers();
    // Override beforeEach getContext mock to return null for first call
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null as unknown as RenderingContext);

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(onFrame).not.toHaveBeenCalled();
  });

  it('grabFrame 실패 시 onError가 호출된다', async () => {
    vi.useFakeTimers();

    class FailingImageCapture {
      constructor(_track: MediaStreamTrack) {}
      async grabFrame(): Promise<never> {
        throw new Error('캡처 실패');
      }
    }
    vi.stubGlobal('ImageCapture', FailingImageCapture);

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith('캡처 실패');
  });
});
