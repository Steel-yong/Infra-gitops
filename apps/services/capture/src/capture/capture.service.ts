// 프레임 이미지를 분석해 자기장 원 데이터를 반환하는 서비스
import { Injectable, Logger, Inject } from '@nestjs/common';
import type { CircleData } from '@pubg-helper/shared';
import { MapDetectionService } from './map-detection.service';
import { CircleService } from './circle.service';

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    @Inject(MapDetectionService) private readonly mapDetection: MapDetectionService,
    @Inject(CircleService) private readonly circleService: CircleService,
  ) {}

  async processFrame(base64: string): Promise<CircleData | null> {
    const mapArea = await this.mapDetection.detectMapArea(base64);
    if (!mapArea) {
      return null;
    }

    this.logger.log(
      `전체맵 열림 감지 — 맵 영역: left=${mapArea.left}, top=${mapArea.top}, ${mapArea.width}x${mapArea.height}`,
    );
    const circle = await this.circleService.extractCircle(base64, mapArea);

    if (circle) {
      this.logger.log(
        `자기장 원 추출 완료: x=${circle.x.toFixed(3)}, y=${circle.y.toFixed(3)}, r=${circle.r.toFixed(3)}`,
      );
    } else {
      this.logger.warn('자기장 원 추출 실패');
    }

    return circle;
  }
}
