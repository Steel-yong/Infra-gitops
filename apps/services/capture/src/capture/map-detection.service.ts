// 캡처 프레임에서 PUBG 전체맵 영역(정사각형)을 검출하는 서비스
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

/** 캡처 화면 내 PUBG 맵 영역 (픽셀 단위) */
export interface MapArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 청록 bounding box 검증 임계값 */
const ASPECT_MIN = 0.8;
const ASPECT_MAX = 1.25;
const MIN_BBOX_WIDTH_RATIO = 0.4;
/** 1차 검증: 청록 픽셀이 전체 샘플의 2% 이상이어야 신뢰. (3% 미만은 이미 null 처리됨) */
const MIN_TEAL_RATIO_FOR_BBOX = 0.02;
const MAP_OPEN_TEAL_RATIO = 0.03;
/** 청록 ≥ 15% = 진짜 전체맵 열림(맵에 따라 청록 비율 다양: 에란겔 50%+, 태이고/사녹 15~30%).
 *  bbox 모양(aspect)이 화면비여서 좁은 검사를 통과 못 해도 이 비율 넘으면 맵 인정. 게임화면(3~5%)과 격차 충분. */
const HIGH_TEAL_RATIO = 0.15;

@Injectable()
export class MapDetectionService {
  private readonly logger = new Logger(MapDetectionService.name);
  /**
   * 캡처 프레임에서 PUBG 전체맵 영역을 검출한다.
   * 1차 시도: 청록(바다) 픽셀의 bounding box로 검출.
   * 검증: 종횡비(0.8~1.25) + 크기(화면 너비 40%↑) + 청록 픽셀 개수(5000↑).
   * 폴백: "화면 높이만큼의 정사각형이 중앙에 있다" 가정.
   * 전체맵이 안 열린 경우(청록 픽셀 비율 3% 미만) null 반환.
   */
  async detectMapArea(base64: string): Promise<MapArea | null> {
    const buffer = Buffer.from(base64, 'base64');
    const image = sharp(buffer);
    const { width = 0, height = 0 } = await image.metadata();

    if (width === 0 || height === 0) return null;

    const { data } = await image
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let tealCount = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    // 4픽셀 간격 샘플링으로 성능 유지
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 3;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // PUBG 전체맵 바다 특유의 어두운 청록색
        if (b > r + 12 && b > g && b >= 38 && r < 115 && g < 115) {
          tealCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalSamples = Math.ceil(width / 4) * Math.ceil(height / 4);
    const tealRatio = tealCount / totalSamples;
    if (tealRatio < MAP_OPEN_TEAL_RATIO) {
      return null;
    }

    // 청록 ≥30% = 화면 대부분이 바다(진짜 전체맵). bbox는 보통 화면 전체로 퍼져 aspect가 화면비
    // (예: 1920×1080→1.78)가 되어 좁은 종횡비 검사를 통과하지 못함 → 모양 무시하고 중앙 정사각형
    // (높이 기준)으로 반환. 정상 맵을 거짓음성으로 거부 못 하게 하는 핵심 가드.
    if (tealRatio >= HIGH_TEAL_RATIO) {
      const side = Math.min(height, width);
      return {
        left: Math.floor((width - side) / 2),
        top: Math.floor((height - side) / 2),
        width: side,
        height: side,
      };
    }

    // 1차: bounding box 검증
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const aspect = bboxH === 0 ? 0 : bboxW / bboxH;
    const aspectOK = aspect > ASPECT_MIN && aspect < ASPECT_MAX;
    const sizeOK = bboxW > width * MIN_BBOX_WIDTH_RATIO;
    const pixelOK = tealRatio > MIN_TEAL_RATIO_FOR_BBOX;

    if (aspectOK && sizeOK && pixelOK) {
      // 정사각형으로 맞춰 반환
      const side = Math.max(bboxW, bboxH);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const left = Math.max(0, Math.floor(cx - side / 2));
      const top = Math.max(0, Math.floor(cy - side / 2));
      return {
        left,
        top,
        width: Math.min(side, width - left),
        height: Math.min(side, height - top),
      };
    }

    // 청록 3~30% + bbox 부적합 = 게임화면 산발 청록(하늘·UI 등). false positive로 거부.
    // (≥30%는 위에서 이미 처리됨.)
    this.logger.debug(
      `맵 검출 거부: 청록 ${(tealRatio * 100).toFixed(1)}%지만 bbox 부적합 ` +
      `(aspect=${aspect.toFixed(2)} sizeOK=${sizeOK} aspectOK=${aspectOK})`,
    );
    return null;
  }

  /** 기존 호환 — detectMapArea 결과의 null 여부로 전체맵 열림 판단 */
  async isMapOpen(base64: string): Promise<boolean> {
    return (await this.detectMapArea(base64)) !== null;
  }
}
