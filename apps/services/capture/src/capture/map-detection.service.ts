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
    if (tealCount / totalSamples < MAP_OPEN_TEAL_RATIO) {
      return null;
    }

    // 1차: bounding box 검증
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const aspect = bboxH === 0 ? 0 : bboxW / bboxH;
    const aspectOK = aspect > ASPECT_MIN && aspect < ASPECT_MAX;
    const sizeOK = bboxW > width * MIN_BBOX_WIDTH_RATIO;
    const pixelOK = tealCount / totalSamples > MIN_TEAL_RATIO_FOR_BBOX;

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

    // bbox 검증 실패 = 청록 픽셀은 3%↑이지만 모양이 맵 아님 (게임화면 산발 청록 = 하늘·바다·UI).
    // 폴백("중앙 정사각형 가정")은 false positive 양산해서 게임화면에서 자기장 자동락 유발 → 제거.
    // 진짜 전체맵 열리면 청록 20~30%+에 bbox도 정상 → 1차 path가 통과.
    this.logger.debug(
      `맵 검출 거부: 청록 ${(tealCount / totalSamples * 100).toFixed(1)}%지만 bbox 부적합 ` +
      `(aspect=${aspect.toFixed(2)} sizeOK=${sizeOK} aspectOK=${aspectOK})`,
    );
    return null;
  }

  /** 기존 호환 — detectMapArea 결과의 null 여부로 전체맵 열림 판단 */
  async isMapOpen(base64: string): Promise<boolean> {
    return (await this.detectMapArea(base64)) !== null;
  }
}
