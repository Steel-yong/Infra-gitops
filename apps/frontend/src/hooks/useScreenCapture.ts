// 화면공유 시작/중지 및 캡처 워커 생명주기를 관리하는 훅

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaptureWorkerResponse } from '../workers/captureWorker';

export interface UseScreenCaptureOptions {
  onFrame: (base64: string) => void;
  onError?: (message: string) => void;
}

export interface UseScreenCaptureReturn {
  isCapturing: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

export function useScreenCapture({ onFrame, onError }: UseScreenCaptureOptions): UseScreenCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const start = useCallback(async () => {
    stop();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '화면공유 권한 거부';
      onError?.(msg);
      return;
    }

    streamRef.current = stream;

    // 사용자가 브라우저 UI로 화면공유를 중지할 때 정리
    stream.getVideoTracks()[0]?.addEventListener('ended', () => stop());

    const worker = new Worker(new URL('../workers/captureWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<CaptureWorkerResponse>) => {
      const msg = event.data;
      if (msg.type === 'FRAME') {
        onFrame(msg.data);
      } else if (msg.type === 'ERROR') {
        onError?.(msg.message);
      }
    };

    worker.postMessage({ type: 'START', stream }, [stream as unknown as Transferable]);
    setIsCapturing(true);
  }, [stop, onFrame, onError]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isCapturing, start, stop };
}
