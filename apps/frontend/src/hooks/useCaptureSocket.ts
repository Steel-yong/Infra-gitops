// capture-service WebSocket 연결 및 CircleData 상태를 관리하는 훅
// isShrinking 신호를 frame upload에 동봉해서 backend가 페이즈 카운터 + 검출 스킵에 활용한다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@pubg-helper/shared';
import type { CircleData, FrameUploadPayload } from '@pubg-helper/shared';

const CAPTURE_SERVICE_URL =
  process.env.NEXT_PUBLIC_CAPTURE_SERVICE_URL ?? 'http://localhost:3001';

export interface UseCaptureSocketReturn {
  circleData: CircleData | null;
  connected: boolean;
  sendFrame: (base64: string) => void;
  /** ocrTimer.isShrinking 변화 시 호출. frame upload payload에 동봉된다. */
  setIsShrinking: (v: boolean) => void;
  /** OCR이 인식한 현재 페이즈(1~8). frame upload payload에 동봉돼 capture hintPhase로 우선 사용. */
  setCurrentPhase: (v: number | null) => void;
  /** 이전 페이즈 락 (parentCircle). 다음 페이즈는 이 원 안에서만 검색되도록 backend에 전달. */
  setParentCircle: (v: CircleData | null) => void;
}

/**
 * capture-service에 socket.io로 연결하고 자기장 원 데이터를 수신한다.
 * setIsShrinking으로 OCR의 isShrinking을 ref에 주입 (page.tsx 변수 정의 순서 회피).
 */
export function useCaptureSocket(): UseCaptureSocketReturn {
  const [circleData, setCircleData] = useState<CircleData | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const isShrinkingRef = useRef(false);
  const currentPhaseRef = useRef<number | null>(null);
  const parentCircleRef = useRef<CircleData | null>(null);
  const setIsShrinking = useCallback((v: boolean) => { isShrinkingRef.current = v; }, []);
  const setCurrentPhase = useCallback((v: number | null) => { currentPhaseRef.current = v; }, []);
  const setParentCircle = useCallback((v: CircleData | null) => { parentCircleRef.current = v; }, []);

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
    const parent = parentCircleRef.current;
    const payload: FrameUploadPayload = {
      base64,
      isShrinking: isShrinkingRef.current,
      ...(currentPhaseRef.current !== null && { currentPhase: currentPhaseRef.current }),
      ...(parent && { parentCircle: { x: parent.x, y: parent.y, r: parent.r, phase: parent.phase } }),
    };
    socketRef.current?.emit(SocketEvents.FRAME_UPLOAD, payload);
  }, []);

  return { circleData, connected, sendFrame, setIsShrinking, setCurrentPhase, setParentCircle };
}
