// useOcrTimer 훅 단위 테스트 — Tesseract worker 모킹, 짧은 intervalMs
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const recognizeMock = vi.fn();
const terminateMock = vi.fn();
const setParametersMock = vi.fn();
const createWorkerMock = vi.fn(async () => ({
  setParameters: setParametersMock,
  recognize: recognizeMock,
  terminate: terminateMock,
}));

vi.mock('tesseract.js', () => ({
  createWorker: createWorkerMock,
}));

function makeMockVideo(width = 1920, height = 1080): HTMLVideoElement {
  return {
    videoWidth: width,
    videoHeight: height,
  } as unknown as HTMLVideoElement;
}

beforeEach(() => {
  recognizeMock.mockReset();
  terminateMock.mockReset();
  setParametersMock.mockReset();
  createWorkerMock.mockClear();
  recognizeMock.mockResolvedValue({ data: { text: '1:38' } });

  const getContextMock = vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(180 * 35 * 4) })),
  }));
  const toDataURLMock = vi.fn(() => 'data:image/png;base64,XXX');
  HTMLCanvasElement.prototype.getContext = getContextMock as never;
  HTMLCanvasElement.prototype.toDataURL = toDataURLMock as never;
});

describe('useOcrTimer', () => {
  it('video=null이면 worker 생성 안 함', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    renderHook(() => useOcrTimer(null, true, 20));
    await new Promise((r) => setTimeout(r, 50));
    expect(createWorkerMock).not.toHaveBeenCalled();
  });

  it('enabled=false면 worker 생성 안 함', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const video = makeMockVideo();
    renderHook(() => useOcrTimer(video, false, 20));
    await new Promise((r) => setTimeout(r, 50));
    expect(createWorkerMock).not.toHaveBeenCalled();
  });

  it('video+enabled=true → worker 1회 생성 + whitelist 설정', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const video = makeMockVideo();
    renderHook(() => useOcrTimer(video, true, 20));

    await waitFor(() => expect(createWorkerMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(setParametersMock).toHaveBeenCalledWith(
        expect.objectContaining({ tessedit_char_whitelist: '0123456789:' }),
      ),
    );
  });

  it('interval 경과 후 worker.recognize 호출 + 결과 파싱', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const { result } = renderHook(() => useOcrTimer(makeMockVideo(), true, 20));

    await waitFor(() => expect(result.current.remainingSeconds).toBe(98), { timeout: 2000 });
    expect(result.current.rawText).toBe('1:38');
  });

  it('파싱 불가능한 텍스트면 remainingSeconds=null + rawText 유지', async () => {
    recognizeMock.mockResolvedValue({ data: { text: 'XX' } });
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const { result } = renderHook(() => useOcrTimer(makeMockVideo(), true, 20));

    await waitFor(() => expect(result.current.rawText).toBe('XX'), { timeout: 2000 });
    expect(result.current.remainingSeconds).toBeNull();
  });

  it('attempts가 OCR 시도마다 증가', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const { result } = renderHook(() => useOcrTimer(makeMockVideo(), true, 20));

    await waitFor(() => expect(result.current.attempts).toBeGreaterThanOrEqual(2), {
      timeout: 2000,
    });
  });

  it('region이 video 해상도에 맞게 반환됨 (2560×1440)', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const video = makeMockVideo(2560, 1440);
    const { result } = renderHook(() => useOcrTimer(video, true, 20));

    await waitFor(() => expect(result.current.region).toEqual({ x: 2240, y: 1095, w: 240, h: 46 }), {
      timeout: 2000,
    });
  });

  it('언마운트 시 worker.terminate 호출', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const video = makeMockVideo();
    const { unmount } = renderHook(() => useOcrTimer(video, true, 20));

    await waitFor(() => expect(createWorkerMock).toHaveBeenCalledTimes(1));
    unmount();
    await waitFor(() => expect(terminateMock).toHaveBeenCalled());
  });

  it('videoWidth=0이면 OCR 안 함 (worker는 생성됨)', async () => {
    const { useOcrTimer } = await import('../hooks/useOcrTimer');
    const video = makeMockVideo(0, 0);
    renderHook(() => useOcrTimer(video, true, 20));

    await waitFor(() => expect(createWorkerMock).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 100));
    expect(recognizeMock).not.toHaveBeenCalled();
  });
});
