// 프론트엔드에서 캡처 프레임을 수신하고 자기장 원 분석 결과를 전송하는 WebSocket Gateway
// 세션별로 마지막 검출된 페이즈를 추적해서 다음 검출의 hintPhase로 사용.
// hintPhase가 있으면 그 페이즈 ±1 후보로 RANSAC 좁혀서 정확도 ↑ (사용자 제안 반영).
import { Inject } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketEvents } from '@pubg-helper/shared';
import type { CircleData, FrameUploadPayload } from '@pubg-helper/shared';
import { CaptureService } from './capture.service';

interface SessionState {
  lastPhase: number;
  lastDetectionTime: number;
  lastResult: CircleData | null;
}

/** 마지막 검출 후 이 시간 안이면 hintPhase 유효 (30초). 그 이후는 cold start. */
const HINT_VALIDITY_MS = 30_000;

@WebSocketGateway({ cors: { origin: '*' } })
export class CaptureGateway {
  @WebSocketServer()
  server!: Server;

  private sessions = new Map<string, SessionState>();

  constructor(@Inject(CaptureService) private readonly captureService: CaptureService) {}

  @SubscribeMessage(SocketEvents.FRAME_UPLOAD)
  async handleFrame(
    @MessageBody() payload: FrameUploadPayload | string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // 후방 호환 — 옛 frontend가 base64 string으로 보낼 수도 있음
    const { base64, isShrinking, currentPhase } =
      typeof payload === 'string'
        ? { base64: payload, isShrinking: false, currentPhase: undefined }
        : payload;

    const sess = this.sessions.get(client.id);

    // OCR이 화면에서 직접 읽은 페이즈가 있으면 그 신호 우선 (가장 정확).
    // 없으면 세션 추적 lastPhase 사용 (이전 검출 기반 추정).
    const hintPhase =
      currentPhase ??
      (sess && Date.now() - sess.lastDetectionTime < HINT_VALIDITY_MS
        ? sess.lastPhase
        : undefined);

    const result = await this.captureService.processFrame(base64, hintPhase);

    // isShrinking 중에는 검출 결과가 같은 페이즈면 lastResult 그대로 재전송 (UI 깜빡임 방지).
    // 그러나 검출이 다른 페이즈(=페이즈 전환)면 즉시 새 결과 emit — 자기장이 다음 페이즈로 줄었음을 의미.
    if (isShrinking && sess?.lastResult) {
      if (!result || result.phase === sess.lastResult.phase) {
        client.emit(SocketEvents.CIRCLE_RESULT, sess.lastResult);
        return;
      }
      // 페이즈 전환 감지 — 그대로 진행해 새 결과 emit + 세션 갱신
    }

    if (result) {
      this.sessions.set(client.id, {
        lastPhase: result.phase ?? sess?.lastPhase ?? 1,
        lastDetectionTime: Date.now(),
        lastResult: result,
      });
      client.emit(SocketEvents.CIRCLE_RESULT, result);
    } else {
      client.emit(SocketEvents.NO_MAP);
    }
  }
}
