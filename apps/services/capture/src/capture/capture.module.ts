// 화면 캡처 및 자기장 원 추출 모듈
import { Module } from '@nestjs/common';
import { CaptureGateway } from './capture.gateway';
import { CaptureService } from './capture.service';
import { MapDetectionService } from './map-detection.service';
import { CircleService } from './circle.service';
import { SiftZoneService } from './sift-zone.service';

@Module({
  providers: [CaptureGateway, CaptureService, MapDetectionService, CircleService, SiftZoneService],
})
export class CaptureModule {}
