// 프레임 이미지를 분석해 자기장 원 데이터를 반환하는 서비스
// 1) mapDetection으로 PUBG 맵 영역(사용자 모니터 어디에 있든) 동적 검출
// 2) 맵 영역만 잘라 circle.service에 전달
import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';
import { MapDetectionService } from './map-detection.service';
import { CircleService } from './circle.service';
import { SiftZoneService } from './sift-zone.service';

// 디버그: 첫 frame 저장 (capture가 실제로 받는 데이터 확인용)
let debugFrameSaved = false;

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    @Inject(MapDetectionService) private readonly mapDetection: MapDetectionService,
    @Inject(CircleService) private readonly circleService: CircleService,
    @Inject(SiftZoneService) private readonly siftZone: SiftZoneService,
  ) {}

  /**
   * @param hintPhase OCR이 단정한 현재 페이즈. 없으면 검출 skip.
   * @param parentCircle 이전 페이즈 락된 자기장 (정규화 0~1). 다음 페이즈는 이 원 안에서만 검색.
   */
  async processFrame(
    base64: string,
    hintPhase?: number,
    parentCircle?: { x: number; y: number; r: number; phase?: number },
  ): Promise<CircleData | null> {
    // 디버그: capture가 실제로 받는 첫 frame을 파일로 저장 (한 번만)
    if (!debugFrameSaved) {
      debugFrameSaved = true;
      const buf = Buffer.from(base64, 'base64');
      await fs.writeFile('/tmp/capture-debug-frame.jpg', buf);
      this.logger.log(`[DEBUG] 첫 frame 저장: /tmp/capture-debug-frame.jpg (${buf.length} bytes)`);
    }

    const mapArea = await this.mapDetection.detectMapArea(base64);
    let circle: CircleData | null = null;

    // 1) 전체맵(기본 줌) 경로
    if (mapArea) {
      this.logger.log(
        `전체맵 영역 검출: left=${mapArea.left}, top=${mapArea.top}, ${mapArea.width}×${mapArea.height}` +
        (hintPhase ? ` (hintPhase=${hintPhase})` : ''),
      );
      const buffer = Buffer.from(base64, 'base64');
      const croppedBuffer = await sharp(buffer)
        .extract({ left: mapArea.left, top: mapArea.top, width: mapArea.width, height: mapArea.height })
        .jpeg()
        .toBuffer();
      circle = await this.circleService.extractCircle(croppedBuffer.toString('base64'), hintPhase, parentCircle);
    }

    // 2) 전체맵 검출/추출 실패(줌인 상태 등) → SIFT-zone(AKAZE 호모그래피) 폴백
    if (!circle) {
      this.logger.debug('전체맵 경로 실패 → SIFT-zone 폴백 시도');
      try {
        circle = await this.siftZone.detectZone(base64);
      } catch (e) {
        this.logger.warn(`SIFT-zone 폴백 오류: ${e instanceof Error ? e.message : e}`);
      }
    }

    if (circle) {
      this.logger.log(`자기장 원 추출 완료: x=${circle.x.toFixed(3)}, y=${circle.y.toFixed(3)}, r=${circle.r.toFixed(3)}, phase=${circle.phase}`);
    } else {
      this.logger.warn('자기장 원 추출 실패 (전체맵·SIFT-zone 모두)');
    }

    return circle;
  }
}
