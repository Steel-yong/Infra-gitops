// capture-service WebSocket 연결 및 CircleData 상태를 관리하는 훅
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@pubg-helper/shared';
import type { CircleData } from '@pubg-helper/shared';

const CAPTURE_SERVICE_URL =
  process.env.NEXT_PUBLIC_CAPTURE_SERVICE_URL ?? 'http://localhost:3001';

export interface UseCaptureSocketReturn {
  circleData: CircleData | null;
  connected: boolean;
  sendFrame: (base64: string) => void;
}

/**
 * capture-service에 socket.io로 연결하고 자기장 원 데이터를 수신한다.
 * - circle:result → circleData 갱신 (이전 원 교체)
 * - map:none → circleData null (원 숨김)
 * - disconnect → circleData 유지 (마지막 원 표시)
 */
export function useCaptureSocket(): UseCaptureSocketReturn {
  const [circleData, setCircleData] = useState<CircleData | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(CAPTURE_SERVICE_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on(SocketEvents.CIRCLE_RESULT, (data: CircleData) => setCircleData(data));
    socket.on(SocketEvents.NO_MAP, () => setCircleData(null));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendFrame = useCallback((base64: string) => {
    socketRef.current?.emit(SocketEvents.FRAME_UPLOAD, base64);
  }, []);

  return { circleData, connected, sendFrame };
}
