// 화면 캡처 스트림에서 프레임을 추출해 base64 JPEG로 변환하는 Web Worker

/// <reference lib="webworker" />

export type CaptureWorkerMessage =
  | { type: 'START'; stream: MediaStream }
  | { type: 'STOP' };

export type CaptureWorkerResponse =
  | { type: 'FRAME'; data: string }
  | { type: 'ERROR'; message: string };

let intervalId: ReturnType<typeof setInterval> | null = null;
let videoTrack: MediaStreamTrack | null = null;
let imageCapture: ImageCapture | null = null;

function stopCapture(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (videoTrack) {
    videoTrack.stop();
    videoTrack = null;
  }
  imageCapture = null;
}

self.onmessage = async (event: MessageEvent<CaptureWorkerMessage>) => {
  const msg = event.data;

  if (msg.type === 'STOP') {
    stopCapture();
    return;
  }

  if (msg.type === 'START') {
    stopCapture();

    const tracks = msg.stream.getVideoTracks();
    if (tracks.length === 0) {
      const res: CaptureWorkerResponse = { type: 'ERROR', message: '비디오 트랙 없음' };
      self.postMessage(res);
      return;
    }

    videoTrack = tracks[0];
    imageCapture = new ImageCapture(videoTrack);

    intervalId = setInterval(async () => {
      if (!imageCapture) return;
      try {
        const bitmap = await imageCapture.grabFrame();
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const res: CaptureWorkerResponse = { type: 'FRAME', data: base64 };
        self.postMessage(res);
      } catch (err) {
        const res: CaptureWorkerResponse = {
          type: 'ERROR',
          message: err instanceof Error ? err.message : '프레임 캡처 실패',
        };
        self.postMessage(res);
      }
    }, 500);
  }
};
