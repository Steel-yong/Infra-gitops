// 화면공유 시작/중지 및 프레임 캡처를 관리하는 훅

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseScreenCaptureOptions {
  onFrame: (base64: string) => void;
  onError?: (message: string) => void;
}

export interface UseScreenCaptureReturn {
  isCapturing: boolean;
  stream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useScreenCapture({ onFrame, onError }: UseScreenCaptureOptions): UseScreenCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsCapturing(false);
  }, []);

  const start = useCallback(async () => {
    stop();

    if (!navigator.mediaDevices?.getDisplayMedia) {
      onError?.('화면공유는 localhost 또는 HTTPS 환경에서만 사용 가능합니다.');
      return;
    }

    let capturedStream: MediaStream;
    try {
      capturedStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '화면공유 권한 거부';
      onError?.(msg);
      return;
    }

    streamRef.current = capturedStream;
    setStream(capturedStream);

    // 사용자가 브라우저 UI로 공유 중지할 때 정리
    capturedStream.getVideoTracks()[0]?.addEventListener('ended', () => stop());

    const track = capturedStream.getVideoTracks()[0];
    if (!track) {
      onError?.('비디오 트랙 없음');
      return;
    }

    const imageCapture = new ImageCapture(track);
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;

    intervalRef.current = setInterval(async () => {
      try {
        const bitmap = await imageCapture.grabFrame();
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        onFrame(base64);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : '프레임 캡처 실패');
      }
    }, 500);

    setIsCapturing(true);
  }, [stop, onFrame, onError]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isCapturing, stream, start, stop };
}
