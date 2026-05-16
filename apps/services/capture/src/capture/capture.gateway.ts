// 프론트엔드에서 캡처 프레임을 수신하고 자기장 원 분석 결과를 전송하는 WebSocket Gateway
// OCR 게이트키퍼 아키텍처: currentPhase 없으면 RANSAC 호출 자체 안 함.
// 페이즈 OCR이 페이즈를 단정해야 자기장 검출 시작 (자기장 형성 = "페이즈 N" 표시).
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
  lastResult: CircleData | null;
}

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
    const { base64, isShrinking, currentPhase, parentCircle } =
      typeof payload === 'string'
        ? { base64: payload, isShrinking: false, currentPhase: undefined, parentCircle: undefined }
        : payload;

    const sess = this.sessions.get(client.id);

    // OCR 게이트키퍼: currentPhase 없으면 RANSAC 호출 자체 안 함.
    // OCR이 페이즈를 단정해야 자기장 검출 시작 (자기장 형성 = "페이즈 N" 표시).
    if (currentPhase === undefined || currentPhase === null) {
      client.emit(SocketEvents.NO_MAP);
      return;
    }
    const hintPhase = currentPhase;

    const result = await this.captureService.processFrame(base64, hintPhase, parentCircle);

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
      this.sessions.set(client.id, { lastResult: result });
      client.emit(SocketEvents.CIRCLE_RESULT, result);
    } else {
      client.emit(SocketEvents.NO_MAP);
    }
  }
}
