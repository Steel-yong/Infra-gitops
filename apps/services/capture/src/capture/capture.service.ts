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

// SIFT-zone(줌) 폴백 게이트 — opencv WASM+AKAZE 매칭이 무거워, 전체맵 미검출 프레임마다 돌면 캡처가 느려진다.
// 줌 자기장(PUB-39)이 완성될 때까지 기본 비활성. 활성하려면 SIFT_ZONE_ENABLED=true.
const SIFT_ZONE_ENABLED = process.env.SIFT_ZONE_ENABLED === 'true';

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

    // 2) 전체맵이 아예 안 잡힘(=줌인 상태 추정)일 때만 SIFT-zone 폴백.
    //    전체맵이 잡혔는데 circle.service가 일시 실패한 경우엔 SIFT를 돌리지 않는다.
    //    (전체맵에서 SIFT는 지명·마커의 흰 픽셀을 자기장으로 오인해 약한 매칭으로 가짜 원을 만든다.)
    if (!circle && !mapArea && SIFT_ZONE_ENABLED) {
      this.logger.debug('전체맵 미검출(줌인 추정) → SIFT-zone 폴백 시도');
      try {
        circle = await this.siftZone.detectZone(base64, hintPhase);
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
