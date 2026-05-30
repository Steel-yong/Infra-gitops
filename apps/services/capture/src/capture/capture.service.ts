// 프레임 이미지를 분석해 자기장 원 데이터를 반환하는 서비스
// 1) mapDetection으로 PUBG 맵 영역(사용자 모니터 어디에 있든) 동적 검출
// 2) 맵 영역만 잘라 circle.service에 전달
import { Injectable, Logger, Inject } from '@nestjs/common';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';
import { MapDetectionService } from './map-detection.service';
import { CircleService } from './circle.service';
import { fitRing, type PixelPoint } from './zoom-detect';

const ZOOM_ANALYSIS_MAX = 1280; // 줌 검출 분석 해상도(긴 변)
const ZOOM_MIN_COVERAGE = 0.12; // 흰 원 신뢰 게이트(검출 흰픽셀 대비 inlier 비율). 미달이면 retain에 맡김.

@Injectable()
export class CaptureService {
  private readonly logger = new Logger(CaptureService.name);

  constructor(
    @Inject(MapDetectionService) private readonly mapDetection: MapDetectionService,
    @Inject(CircleService) private readonly circleService: CircleService,
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

    // 2) 전체맵 미검출(=줌인 추정) + 앵커(parentCircle) 있을 때 줌 자기장 검출.
    //    줌 화면 흰 자기장 원을 RANSAC으로 검출(zoom-detect, 2v/4v 실프레임 검증). 검출되면
    //    현재 자기장의 절대위치는 앵커가 알므로 그대로 출력(검출로 "줌에서도 자기장 존재" 확인).
    //    (실패하던 SIFT 전체매칭 대체. 줌 중 페이즈 전환 능동추적은 후속 — 둘째 흰 원 안정검출 필요.)
    if (!circle && !mapArea && parentCircle) {
      this.logger.debug('전체맵 미검출(줌인 추정) → 줌 자기장 검출');
      try {
        circle = await this.detectZoneZoom(base64, hintPhase, parentCircle);
      } catch (e) {
        this.logger.warn(`줌 자기장 검출 오류: ${e instanceof Error ? e.message : e}`);
      }
    }

    if (circle) {
      this.logger.log(`자기장 원 추출 완료: x=${circle.x.toFixed(3)}, y=${circle.y.toFixed(3)}, r=${circle.r.toFixed(3)}, phase=${circle.phase}`);
    } else {
      this.logger.warn('자기장 원 추출 실패 (전체맵·SIFT-zone 모두)');
    }

    return circle;
  }

  /**
   * 줌 화면에서 흰 자기장 원을 RANSAC 검출 → 현재 자기장(앵커)을 확인·반환.
   * 검출 성공 = "줌에서도 자기장 존재" 확인. 절대위치는 앵커(전체맵 락)가 안다.
   * @param anchor 전체맵에서 락된 현재 자기장(절대 0~1).
   */
  private async detectZoneZoom(
    base64: string,
    hintPhase: number | undefined,
    anchor: { x: number; y: number; r: number; phase?: number },
  ): Promise<CircleData | null> {
    const buf = Buffer.from(base64, 'base64');
    const meta = await sharp(buf).metadata();
    const ow = meta.width ?? 0;
    const oh = meta.height ?? 0;
    if (!ow || !oh) return null;
    const scale = Math.min(1, ZOOM_ANALYSIS_MAX / Math.max(ow, oh));
    const w = Math.round(ow * scale);
    const h = Math.round(oh * scale);
    const raw = await sharp(buf).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer();

    // 흰 픽셀(자기장 호) 수집 — 우측 UI(>78%) 제외, stride 2 샘플.
    const pts: PixelPoint[] = [];
    const xlim = Math.floor(w * 0.78);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < xlim; x += 2) {
        const i = (y * w + x) * 3;
        if (raw[i] > 200 && raw[i + 1] > 200 && raw[i + 2] > 200) pts.push([x, y]);
      }
    }
    const ring = fitRing(pts, { rMin: 30, rMax: Math.round(w * 0.45) });
    if (!ring || ring.coverage < ZOOM_MIN_COVERAGE) return null; // 신뢰 못하면 retain에 맡김

    this.logger.log(
      `줌 자기장 검출: inlier=${ring.inliers} coverage=${(ring.coverage * 100).toFixed(0)}% → 앵커 자기장 확인`,
    );
    return { x: anchor.x, y: anchor.y, r: anchor.r, phase: anchor.phase ?? hintPhase };
  }
}
