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
  /** capture-service → 프론트: 플레이어(유저 본인) 실시간 위치 */
  PLAYER_RESULT: 'player:result',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];

/** frame:upload payload — frontend가 isShrinking 신호 동봉. 후방 호환: 문자열도 허용.
 * currentPhase: OCR이 게임 화면 "페이즈 N" 글자에서 인식한 현재 페이즈 (1~8). 검출 hintPhase 우선 사용.
 * parentCircle: 이전 페이즈에서 락된 자기장 (정규화 0~1). 다음 페이즈는 이 원 안에서만 검색. */
export interface FrameUploadPayload {
  base64: string;
  isShrinking: boolean;
  currentPhase?: number;
  parentCircle?: { x: number; y: number; r: number; phase?: number };
}
