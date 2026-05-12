// alert-service WebSocket Gateway — 타이머 상태 수신 + 알림 이벤트 emit
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import type { TimerState } from '@pubg-helper/shared';
import { TimerStateService } from './timer-state.service';

@WebSocketGateway({ cors: true })
export class AlertGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AlertGateway.name);

  constructor(
    @Inject(TimerStateService) private readonly timerStateService: TimerStateService,
  ) {}

  @SubscribeMessage('timer-state')
  handleTimerState(
    @ConnectedSocket() client: Socket,
    @MessageBody() state: TimerState,
  ): void {
    try {
      const alerts = this.timerStateService.processTimerState(client.id, state);
      for (const alertEvent of alerts) {
        this.logger.log(`알림 이벤트 emit: ${alertEvent} → 클라이언트 ${client.id}`);
        client.emit(alertEvent);
      }
    } catch {
      client.emit('error', { message: '유효하지 않은 TimerState 형식' });
    }
  }

  handleDisconnect(client: Socket): void {
    this.timerStateService.removeClient(client.id);
    this.logger.log(`클라이언트 연결 해제: ${client.id}`);
  }
}
