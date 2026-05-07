// 프론트엔드에서 캡처 프레임을 수신하고 자기장 원 분석 결과를 전송하는 WebSocket Gateway
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
import { CaptureService } from './capture.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class CaptureGateway {
  @WebSocketServer()
  server!: Server;

  constructor(@Inject(CaptureService) private readonly captureService: CaptureService) {}

  @SubscribeMessage(SocketEvents.FRAME_UPLOAD)
  async handleFrame(
    @MessageBody() base64: string,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const result = await this.captureService.processFrame(base64);
    if (result) {
      client.emit(SocketEvents.CIRCLE_RESULT, result);
    } else {
      client.emit(SocketEvents.NO_MAP);
    }
  }
}
