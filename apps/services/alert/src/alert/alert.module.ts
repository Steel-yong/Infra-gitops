// 자기장 타이머 알림 모듈
import { Module } from '@nestjs/common';
import { AlertGateway } from './alert.gateway';
import { TimerStateService } from './timer-state.service';

@Module({
  providers: [AlertGateway, TimerStateService],
})
export class AlertModule {}
