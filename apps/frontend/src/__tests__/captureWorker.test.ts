// captureWorker 메시지 핸들러 단위 테스트

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// OffscreenCanvas mock
class MockOffscreenCanvas {
  width: number;
  height: number;
  private ctx = {
    drawImage: vi.fn(),
  };
  constructor(w: number, h: number) {
    this.width = w;
    this.height = h;
  }
  getContext() {
    return this.ctx;
  }
  async convertToBlob(): Promise<Blob> {
    // jsdom Blob.arrayBuffer() 호환성 문제 우회: arrayBuffer를 직접 구현
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    return {
      arrayBuffer: async () => bytes.buffer as ArrayBuffer,
      type: 'image/jpeg',
      size: bytes.byteLength,
    } as unknown as Blob;
  }
}

// ImageCapture mock
class MockImageCapture {
  async grabFrame(): Promise<ImageBitmap> {
    return {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;
  }
}

// MediaStreamTrack mock
function makeMockTrack(): MediaStreamTrack {
  const listeners: Record<string, EventListener[]> = {};
  return {
    stop: vi.fn(),
    addEventListener: (type: string, cb: EventListener) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(cb);
    },
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaStreamTrack;
}

function makeMockStream(tracks: MediaStreamTrack[] = []): MediaStream {
  return {
    getVideoTracks: () => tracks,
    getTracks: () => tracks,
  } as unknown as MediaStream;
}

describe('captureWorker 메시지 핸들러', () => {
  let originalOnMessage: ((event: MessageEvent) => void) | null = null;
  let postedMessages: unknown[] = [];

  beforeEach(async () => {
    postedMessages = [];
    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);
    vi.stubGlobal('ImageCapture', MockImageCapture);
    vi.stubGlobal('self', {
      postMessage: (msg: unknown) => postedMessages.push(msg),
      onmessage: null,
    });

    // 워커 모듈 로드 (self.onmessage 등록)
    vi.resetModules();
    await import('../workers/captureWorker');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalOnMessage = (self as any).onmessage as ((event: MessageEvent) => void) | null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('STOP 메시지를 처리하면 아무것도 postMessage하지 않는다', async () => {
    await originalOnMessage!({ data: { type: 'STOP' } } as MessageEvent);
    expect(postedMessages).toHaveLength(0);
  });

  it('START 메시지에 비디오 트랙이 없으면 ERROR를 postMessage한다', async () => {
    const stream = makeMockStream([]);
    await originalOnMessage!({ data: { type: 'START', stream } } as MessageEvent);
    expect(postedMessages).toHaveLength(1);
    expect((postedMessages[0] as { type: string }).type).toBe('ERROR');
  });

  it('START 메시지에 비디오 트랙이 있으면 500ms 후 FRAME을 postMessage한다', async () => {
    vi.useFakeTimers();
    const track = makeMockTrack();
    const stream = makeMockStream([track]);

    await originalOnMessage!({ data: { type: 'START', stream } } as MessageEvent);

    // 500ms 진행 후 async 체인 완전히 플러시
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(postedMessages.length).toBeGreaterThanOrEqual(1);
    const types = (postedMessages as { type: string }[]).map((m) => m.type);
    expect(types).toContain('FRAME');
  });

  it('START 후 STOP을 보내면 인터벌과 트랙이 정리된다', async () => {
    vi.useFakeTimers();
    const track = makeMockTrack();
    const stream = makeMockStream([track]);

    await originalOnMessage!({ data: { type: 'START', stream } } as MessageEvent);
    // STOP 전에 인터벌이 설정된 상태에서 STOP 전송 → lines 19-25 실행
    await originalOnMessage!({ data: { type: 'STOP' } } as MessageEvent);

    expect(track.stop).toHaveBeenCalled();
    expect(postedMessages).toHaveLength(0);
  });

  it('grabFrame 실패 시 ERROR를 postMessage한다', async () => {
    vi.useFakeTimers();

    class FailingImageCapture {
      async grabFrame(): Promise<never> {
        throw new Error('캡처 장치 오류');
      }
    }
    vi.stubGlobal('ImageCapture', FailingImageCapture);

    const track = makeMockTrack();
    const stream = makeMockStream([track]);

    await originalOnMessage!({ data: { type: 'START', stream } } as MessageEvent);
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    const errors = (postedMessages as { type: string; message?: string }[]).filter(
      (m) => m.type === 'ERROR',
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toBe('캡처 장치 오류');
  });

  it('grabFrame이 Error가 아닌 값을 throw하면 기본 메시지로 ERROR를 postMessage한다', async () => {
    vi.useFakeTimers();

    class NonErrorThrowingCapture {
      async grabFrame(): Promise<never> {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw '문자열 에러';
      }
    }
    vi.stubGlobal('ImageCapture', NonErrorThrowingCapture);

    const track = makeMockTrack();
    const stream = makeMockStream([track]);

    await originalOnMessage!({ data: { type: 'START', stream } } as MessageEvent);
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    const errors = (postedMessages as { type: string; message?: string }[]).filter(
      (m) => m.type === 'ERROR',
    );
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0].message).toBe('프레임 캡처 실패');
  });

  it('getContext가 null을 반환하면 postMessage하지 않는다', async () => {
    vi.useFakeTimers();

    class NullContextCanvas {
      width: number;
      height: number;
      constructor(w: number, h: number) { this.width = w; this.height = h; }
      getContext() { return null; }
      async convertToBlob(): Promise<Blob> { return {} as Blob; }
    }
    vi.stubGlobal('OffscreenCanvas', NullContextCanvas);

    const track = makeMockTrack();
    const stream = makeMockStream([track]);

    await originalOnMessage!({ data: { type: 'START', stream } } as MessageEvent);
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();
    await Promise.resolve();

    // ctx null이면 return하므로 postMessage 없음
    expect(postedMessages).toHaveLength(0);
  });
});
