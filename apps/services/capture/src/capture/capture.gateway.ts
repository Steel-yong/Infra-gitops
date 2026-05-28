// 프론트엔드에서 캡처 프레임을 수신하고 자기장 원 분석 결과를 전송하는 WebSocket Gateway
// OCR 게이트키퍼 아키텍처: currentPhase 없으면 RANSAC 호출 자체 안 함.
// 페이즈 OCR이 페이즈를 단정해야 자기장 검출 시작 (자기장 형성 = "페이즈 N" 표시).
// busy 가드: 클라별 FrameThrottle로 무거운 검출을 직렬화 + 최신 프레임만 처리(백엔드 과부하 방지).
import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketEvents } from '@pubg-helper/shared';
import type { CircleData, FrameUploadPayload } from '@pubg-helper/shared';
import { CaptureService } from './capture.service';
import { FrameThrottle } from './frame-throttle';

interface SessionState {
  lastResult: CircleData | null;
}

/** 스로틀에 넘기는 프레임 작업 단위 (OCR 게이트 통과분만). */
interface FrameJob {
  base64: string;
  isShrinking: boolean;
  hintPhase: number;
  parentCircle?: { x: number; y: number; r: number; phase?: number };
}

@WebSocketGateway({ cors: { origin: '*' } })
export class CaptureGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CaptureGateway.name);
  private sessions = new Map<string, SessionState>();
  // 클라이언트별 스로틀 — 처리속도(2~3초)보다 빨리(0.5초) 들어오는 프레임을 skip-to-latest로 캡.
  private throttles = new Map<string, FrameThrottle<FrameJob>>();

  constructor(@Inject(CaptureService) private readonly captureService: CaptureService) {}

  /** 연결 종료 시 클라별 상태 정리(맵 누수 방지). */
  handleDisconnect(client: Socket): void {
    this.sessions.delete(client.id);
    this.throttles.delete(client.id);
  }

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

    // OCR 게이트키퍼(저비용): currentPhase 없으면 RANSAC 호출 자체 안 함 → 스로틀 이전에 즉시 처리.
    if (currentPhase === undefined || currentPhase === null) {
      client.emit(SocketEvents.NO_MAP);
      return;
    }

    // 무거운 검출은 클라별 스로틀로 직렬화 + 최신만 처리.
    let throttle = this.throttles.get(client.id);
    if (!throttle) {
      throttle = new FrameThrottle<FrameJob>(
        (job) => this.detectAndEmit(job, client),
        (err) => this.logger.warn(`프레임 처리 실패: ${err instanceof Error ? err.message : err}`),
      );
      this.throttles.set(client.id, throttle);
    }
    await throttle.submit({ base64, isShrinking, hintPhase: currentPhase, parentCircle });
  }

  /** 무거운 자기장 검출 + isShrinking 처리 + 결과 emit (스로틀이 한 번에 하나만 실행). */
  private async detectAndEmit(job: FrameJob, client: Socket): Promise<void> {
    const sess = this.sessions.get(client.id);
    const result = await this.captureService.processFrame(job.base64, job.hintPhase, job.parentCircle);

    // isShrinking 중에는 검출 결과가 같은 페이즈면 lastResult 그대로 재전송 (UI 깜빡임 방지).
    // 그러나 검출이 다른 페이즈(=페이즈 전환)면 즉시 새 결과 emit — 자기장이 다음 페이즈로 줄었음을 의미.
    if (job.isShrinking && sess?.lastResult) {
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
