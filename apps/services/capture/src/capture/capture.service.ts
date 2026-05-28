// 프레임 이미지를 분석해 자기장 원 데이터를 반환하는 서비스
// 1) mapDetection으로 PUBG 맵 영역(사용자 모니터 어디에 있든) 동적 검출
// 2) 맵 영역만 잘라 circle.service에 전달
import { Injectable, Logger, Inject } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';
import { MapDetectionService } from './map-detection.service';
import { CircleService } from './circle.service';
import { fitRing, extractBlueOutsideBoundary, type PixelPoint } from './zoom-detect';

// 디버그: 첫 frame 저장 (capture가 실제로 받는 데이터 확인용)
let debugFrameSaved = false;

const ZOOM_ANALYSIS_MAX = 1280; // 줌 검출 분석 해상도(긴 변)
const ZOOM_MIN_COVERAGE = 0.12; // 흰 원 신뢰 게이트(검출 흰픽셀 대비 inlier 비율). 미달이면 retain에 맡김.
const ZOOM_OUTER_MIN_COVERAGE = 0.05; // 외부 경계 신뢰 게이트(전 boundary 픽셀 대비 inlier).
const PUBG_PHASE_RATIO = 0.5497; // PUBG 페이즈 반경비(N+1/N). 능동추적 sanity 게이트.
const PUBG_PHASE_RATIO_TOL = 0.18; // ±0.18 허용 (이론 0.55, 측정 0.37~0.73).

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

    // 2) 전체맵 미검출(=줌인 추정) + 앵커(parentCircle) 있을 때 줌 자기장 검출 + 능동추적.
    //    - 흰 원(다음 자기장 후보) RANSAC.
    //    - 외부 경계(현재 자기장=앵커) RANSAC.
    //    - 둘 다 잡히면 chain transform으로 다음 자기장 절대좌표 계산(능동추적).
    //    - 외부만 안 잡히면 앵커 그대로 출력(현재 자기장 확인). 둘 다 안 잡히면 retain.
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
      this.logger.warn('자기장 원 추출 실패 (전체맵·줌 모두)');
    }

    return circle;
  }

  /**
   * 줌 화면 자기장 검출 + 능동추적.
   * 1) 흰 원(다음 자기장 후보) RANSAC.
   * 2) 외부 경계(현재 자기장=앵커) RANSAC.
   * 3) 둘 다 잡히면: outer(픽셀) ↔ anchor(절대)로 scale·origin 계산 → inner 픽셀을 절대좌표로 변환 → 새 페이즈.
   * 4) outer 부재(강한 줌) or sanity 실패 → 앵커 그대로 반환(현재 자기장 확인).
   * 5) inner도 부재 → null(retain에 맡김).
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
    const sc = Math.min(1, ZOOM_ANALYSIS_MAX / Math.max(ow, oh));
    const w = Math.round(ow * sc);
    const h = Math.round(oh * sc);
    const raw = await sharp(buf).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer();

    // 1) 흰 픽셀 수집 → RANSAC 원.
    const whitePts: PixelPoint[] = [];
    const xlim = Math.floor(w * 0.78);
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < xlim; x += 2) {
        const i = (y * w + x) * 3;
        if (raw[i] > 200 && raw[i + 1] > 200 && raw[i + 2] > 200) whitePts.push([x, y]);
      }
    }
    const inner = fitRing(whitePts, { rMin: 30, rMax: Math.round(w * 0.45) });
    if (!inner || inner.coverage < ZOOM_MIN_COVERAGE) return null;

    // 2) 외부 경계 픽셀 수집 → RANSAC 원.
    const boundaryPts = extractBlueOutsideBoundary(raw, w, h);
    const outer = fitRing(boundaryPts, { rMin: Math.round(w * 0.05), rMax: Math.round(w * 0.6) });

    // 3) 두 원 모두 잡히면 chain transform으로 능동추적.
    if (outer && outer.coverage >= ZOOM_OUTER_MIN_COVERAGE && anchor.r > 0) {
      const scale = outer.pr / anchor.r; // 픽셀/단위
      const newAbsX = (inner.px - outer.px) / scale + anchor.x;
      const newAbsY = (inner.py - outer.py) / scale + anchor.y;
      const newAbsR = inner.pr / scale;
      // sanity: 새 자기장은 앵커 안 + 반경비 PUBG 페이즈비 근처.
      const centerDist = Math.hypot(newAbsX - anchor.x, newAbsY - anchor.y);
      const ratio = newAbsR / anchor.r;
      const insideAnchor = centerDist + newAbsR <= anchor.r * 1.05; // 5% 여유
      const ratioOK = Math.abs(ratio - PUBG_PHASE_RATIO) <= PUBG_PHASE_RATIO_TOL;
      if (insideAnchor && ratioOK) {
        this.logger.log(
          `줌 능동추적: outer(cov=${(outer.coverage * 100).toFixed(0)}%) + inner(cov=${(inner.coverage * 100).toFixed(0)}%) ` +
          `→ 새 자기장 abs=(${newAbsX.toFixed(3)},${newAbsY.toFixed(3)}) r=${newAbsR.toFixed(3)} ratio=${ratio.toFixed(2)}`,
        );
        return { x: newAbsX, y: newAbsY, r: newAbsR, phase: hintPhase ?? ((anchor.phase ?? 1) + 1) };
      }
      this.logger.debug(
        `줌 능동추적 sanity 실패: ratio=${ratio.toFixed(2)} inside=${insideAnchor} → 앵커 확인만`,
      );
    }

    // 4) outer 부재 또는 sanity 실패 → 앵커 확인.
    this.logger.log(
      `줌 자기장 검출(앵커 확인만): inner cov=${(inner.coverage * 100).toFixed(0)}%, outer ${outer ? `cov=${(outer.coverage * 100).toFixed(0)}%` : '미검출'}`,
    );
    return { x: anchor.x, y: anchor.y, r: anchor.r, phase: anchor.phase ?? hintPhase };
  }
}
