// WebSocket 소켓 이벤트 상수 (const enum 대신 as const 사용 — 크로스 패키지 빌드 호환)

export const SocketEvents = {
  /** 프론트 → capture-service: 캡처 프레임 전송 */
  FRAME_UPLOAD: 'frame:upload',
  /** capture-service → 프론트: 자기장 원 분석 결과 */
  CIRCLE_RESULT: 'circle:result',
  /** capture-service → 프론트: 전체맵이 열리지 않은 프레임 */
  NO_MAP: 'map:none',
  /** alert-service → 프론트: 타이머 상태 업데이트 */
  TIMER_UPDATE: 'timer:update',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

/** frame:upload payload — frontend가 isShrinking 신호 동봉. 후방 호환: 문자열도 허용. */
export interface FrameUploadPayload {
  base64: string;
  isShrinking: boolean;
}
