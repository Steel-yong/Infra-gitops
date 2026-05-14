// 캡처 프레임에서 자기장 원의 중심과 반경을 추출하는 서비스
// 접근법: PUBG가 자기장 바깥을 파란색으로 채우는 특성 이용
//   1) 파란색 픽셀(자기장 외부) 분류
//   2) 비-파란색 영역(자기장 내부) bounding box → 중심 + 반경 후보
//   3) 페이즈 반경에 가장 가까운 PUBG 공식 페이즈로 클램프
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';

/** PUBG 페이즈별 자기장 반경 비율 (radius_m / 8000m) */
const PUBG_PHASE_RADII = [
  0.1875,  // phase 1: 1500m
  0.1375,  // phase 2: 1100m
  0.0825,  // phase 3: 660m
  0.05,    // phase 4: 400m
  0.03,    // phase 5: 240m
  0.0181,  // phase 6: 145m
  0.00875, // phase 7: 70m
  0.0044,  // phase 8: 35m
] as const;

@Injectable()
export class CircleService {
  private readonly logger = new Logger(CircleService.name);

  async extractCircle(base64: string): Promise<CircleData | null> {
    const buffer = Buffer.from(base64, 'base64');
    const { data, info } = await sharp(buffer)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const mapSize = Math.min(width, height);
    const step = 4;

    // 1) 파란색 픽셀 분류: PUBG 자기장 외부 색상 (b > r + 20, b > g, 충분히 진한 파랑)
    //    동시에 "자기장 내부" 픽셀 좌표를 모은다.
    const inside: [number, number][] = [];
    let blueCount = 0;
    let sampleCount = 0;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 3;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const isBlueTint = b > r + 25 && b > g + 10 && b > 80 && r < 140;
        sampleCount++;
        if (isBlueTint) {
          blueCount++;
        } else {
          // 자기장 내부 후보: 충분히 밝되 파랗지 않은 픽셀
          const brightness = (r + g + b) / 3;
          if (brightness > 50 && brightness < 220) {
            inside.push([x, y]);
          }
        }
      }
    }

    // 파란색 자기장 외부 영역이 충분치 않으면 자기장 표시 없음으로 판단
    const blueRatio = blueCount / sampleCount;
    if (blueRatio < 0.05) {
      this.logger.debug(`파란 외부 영역 부족: ${(blueRatio * 100).toFixed(1)}%`);
      return null;
    }
    if (inside.length < 100) {
      this.logger.debug(`자기장 내부 후보 픽셀 부족: ${inside.length}개`);
      return null;
    }

    // 2) 내부 픽셀의 중심 추정 — outlier에 강한 trimmed mean
    inside.sort((a, b) => a[0] - b[0]);
    const trimX = Math.floor(inside.length * 0.1);
    const xTrim = inside.slice(trimX, inside.length - trimX);
    inside.sort((a, b) => a[1] - b[1]);
    const trimY = Math.floor(inside.length * 0.1);
    const yTrim = inside.slice(trimY, inside.length - trimY);

    const cx = xTrim.reduce((s, [x]) => s + x, 0) / xTrim.length;
    const cy = yTrim.reduce((s, [, y]) => s + y, 0) / yTrim.length;

    // 3) 내부 픽셀들이 중심에서 얼마나 멀리 퍼져 있는지로 반경 추정
    //    각 내부 픽셀의 중심 거리 분포 90 percentile을 근사 반경으로
    const distances = inside.map(([x, y]) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2));
    distances.sort((a, b) => a - b);
    const p90 = distances[Math.floor(distances.length * 0.9)];
    const estimatedR = p90;

    // 4) 추정 반경을 PUBG 공식 페이즈 반경 중 가장 가까운 값으로 클램프
    let bestPhase = 1;
    let bestDiff = Infinity;
    for (let p = 0; p < PUBG_PHASE_RADII.length; p++) {
      const phaseRadiusPx = PUBG_PHASE_RADII[p] * mapSize;
      const diff = Math.abs(estimatedR - phaseRadiusPx);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestPhase = p + 1;
      }
    }
    const finalRadiusPx = PUBG_PHASE_RADII[bestPhase - 1] * mapSize;

    this.logger.log(
      `자기장 검출: 페이즈 ${bestPhase} (estimatedR=${estimatedR.toFixed(0)}px → ${finalRadiusPx.toFixed(0)}px, center=(${(cx / width).toFixed(3)}, ${(cy / height).toFixed(3)}), blue=${(blueRatio * 100).toFixed(1)}%)`,
    );

    return {
      x: cx / width,
      y: cy / height,
      r: finalRadiusPx / mapSize,
    };
  }
}
