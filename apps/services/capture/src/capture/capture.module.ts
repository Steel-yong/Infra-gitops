// 화면 캡처 및 자기장 원 추출 모듈
import { Module } from '@nestjs/common';
import { CaptureGateway } from './capture.gateway';
import { CaptureService } from './capture.service';

@Module({
  providers: [CaptureGateway, CaptureService],
})
export class CaptureModule {}
