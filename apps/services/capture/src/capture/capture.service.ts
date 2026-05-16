// 프레임 이미지를 분석해 자기장 원 데이터를 반환하는 서비스
// 1) mapDetection으로 PUBG 맵 영역(사용자 모니터 어디에 있든) 동적 검출
// 2) 맵 영역만 잘라 circle.service에 전달
import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';
import { MapDetectionService } from './map-detection.service';
import { CircleService } from './circle.service';

// 디버그: 첫 frame 저장 (capture가 실제로 받는 데이터 확인용)
let debugFrameSaved = false;

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    @Inject(MapDetectionService) private readonly mapDetection: MapDetectionService,
    @Inject(CircleService) private readonly circleService: CircleService,
  ) {}

  /**
   * @param hintPhase 이전 검출 페이즈. gateway가 세션마다 추적해서 전달하면 검출 정확도 ↑.
   */
  async processFrame(base64: string, hintPhase?: number): Promise<CircleData | null> {
    // 디버그: capture가 실제로 받는 첫 frame을 파일로 저장 (한 번만)
    if (!debugFrameSaved) {
      debugFrameSaved = true;
      const buf = Buffer.from(base64, 'base64');
      await fs.writeFile('/tmp/capture-debug-frame.jpg', buf);
      this.logger.log(`[DEBUG] 첫 frame 저장: /tmp/capture-debug-frame.jpg (${buf.length} bytes)`);
    }

    const mapArea = await this.mapDetection.detectMapArea(base64);
    if (!mapArea) {
      return null;
    }

    this.logger.log(
      `전체맵 영역 검출: left=${mapArea.left}, top=${mapArea.top}, ${mapArea.width}×${mapArea.height}` +
      (hintPhase ? ` (hintPhase=${hintPhase})` : ''),
    );

    const buffer = Buffer.from(base64, 'base64');
    const croppedBuffer = await sharp(buffer)
      .extract({
        left: mapArea.left,
        top: mapArea.top,
        width: mapArea.width,
        height: mapArea.height,
      })
      .jpeg()
      .toBuffer();
    const croppedBase64 = croppedBuffer.toString('base64');

    const circle = await this.circleService.extractCircle(croppedBase64, hintPhase);

    if (circle) {
      this.logger.log(`자기장 원 추출 완료: x=${circle.x.toFixed(3)}, y=${circle.y.toFixed(3)}, r=${circle.r.toFixed(3)}, phase=${circle.phase}`);
    } else {
      this.logger.warn('자기장 원 추출 실패');
    }

    return circle;
  }
}
