// 캡처 프레임에서 자기장 원의 중심과 반경을 추출하는 서비스
// 접근법: 페이즈 1 cold start = 노란 점(다음 자기장 마커) 검출 + 페이즈 1 알려진 반경
//        fallback = 흰 픽셀 RANSAC 원 피팅 (페이즈 1 반경 후보)
//        맵 영역(화면 중앙 정사각형) crop 후 정규화 — 1080×1080 등
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';

/** PUBG 페이즈별 자기장 반경 비율 (radius_m / 8160m)
 * 출처: PUBG 공식 페이즈 데이터 표 (지름·축소 비율 자기 검증됨)
 * 분모 8160m = documentation.pubg.com/en/telemetry-objects.html */
const PUBG_PHASE_RADII = [
  0.24474, // phase 1: 반경 1997.05m (지름 3994.1m)
  0.13461, // phase 2: 반경 1098.40m (지름 2196.8m)
  0.07403, // phase 3: 반경 604.10m  (지름 1208.2m)
  0.04072, // phase 4: 반경 332.25m  (지름 664.5m)
  0.02036, // phase 5: 반경 166.15m  (지름 332.3m)
  0.01018, // phase 6: 반경 83.05m   (지름 166.1m)
  0.00509, // phase 7: 반경 41.55m   (지름 83.1m)
  0.00254, // phase 8: 반경 20.75m   (지름 41.5m)
  0.00001, // phase 9: 반경 <0.05m (거의 점, 핀치)
] as const;

interface CropArea {
  data: Buffer;
  size: number;     // 정사각형 한 변 (픽셀)
  offsetX: number;
  offsetY: number;
}

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

    // 1) 맵 영역 crop — PUBG 전체맵은 화면 중앙의 정사각형(높이 기준)
    const cropped = this.cropMapArea(data, width, height);

    // 2) 페이즈 1 cold start — 가설 C: 노란 점 마커
    const yellowCenter = this.detectYellowMarker(cropped.data, cropped.size);
    if (yellowCenter) {
      const rPx = PUBG_PHASE_RADII[0] * cropped.size; // 페이즈 1 반경
      this.logger.log(
        `자기장 검출 (노란 마커): 페이즈 1 center=(${(yellowCenter.cx / cropped.size).toFixed(3)}, ${(yellowCenter.cy / cropped.size).toFixed(3)}), r=${rPx.toFixed(0)}px, marker pixels=${yellowCenter.score}`,
      );
      return {
        x: yellowCenter.cx / cropped.size,
        y: yellowCenter.cy / cropped.size,
        r: PUBG_PHASE_RADII[0],
        phase: 1,
      };
    }

    // 3) Fallback — 가설 A: 흰 픽셀 RANSAC (페이즈 1 반경 후보)
    const ransacResult = this.detectWhitePixelRANSAC(cropped.data, cropped.size);
    if (ransacResult) {
      this.logger.log(
        `자기장 검출 (흰픽셀 RANSAC fallback): 페이즈 1 center=(${(ransacResult.cx / cropped.size).toFixed(3)}, ${(ransacResult.cy / cropped.size).toFixed(3)}), r=${ransacResult.r.toFixed(0)}px, score=${ransacResult.score}`,
      );
      return {
        x: ransacResult.cx / cropped.size,
        y: ransacResult.cy / cropped.size,
        r: ransacResult.r / cropped.size,
        phase: 1,
      };
    }

    this.logger.debug('자기장 원 추출 실패: 노란 마커·흰 원 둘 다 미검출');
    return null;
  }

  /** 화면 중앙 정사각형(높이 기준)을 잘라낸다 — PUBG 맵 영역. */
  private cropMapArea(pixels: Buffer, width: number, height: number): CropArea {
    const size = height;
    const offsetX = Math.floor((width - size) / 2);
    const offsetY = 0;
    const out = Buffer.alloc(size * size * 3);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcIdx = ((y + offsetY) * width + (x + offsetX)) * 3;
        const dstIdx = (y * size + x) * 3;
        out[dstIdx] = pixels[srcIdx];
        out[dstIdx + 1] = pixels[srcIdx + 1];
        out[dstIdx + 2] = pixels[srcIdx + 2];
      }
    }
    return { data: out, size, offsetX, offsetY };
  }

  /** 노란 점(다음 자기장 마커) 검출 — 가장 큰 노란 클러스터의 평균 좌표. */
  private detectYellowMarker(
    pixels: Buffer,
    size: number,
  ): { cx: number; cy: number; score: number } | null {
    // 노란 픽셀: R≥200, G≥180, B≤100
    const yellowPoints: Array<[number, number]> = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 3;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (r >= 200 && g >= 180 && b <= 100) {
          yellowPoints.push([x, y]);
        }
      }
    }
    if (yellowPoints.length < 5) return null;

    // BFS로 클러스터 찾기 — 가장 큰 것 = 마커
    const yellowSet = new Set(yellowPoints.map(([x, y]) => y * size + x));
    const visited = new Set<number>();
    const clusters: Array<Array<[number, number]>> = [];
    for (const [sx, sy] of yellowPoints) {
      const sk = sy * size + sx;
      if (visited.has(sk)) continue;
      const cluster: Array<[number, number]> = [];
      const queue: Array<[number, number]> = [[sx, sy]];
      while (queue.length) {
        const [x, y] = queue.shift()!;
        const k = y * size + x;
        if (visited.has(k)) continue;
        visited.add(k);
        cluster.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nk = (y + dy) * size + (x + dx);
          if (yellowSet.has(nk) && !visited.has(nk)) {
            queue.push([x + dx, y + dy]);
          }
        }
      }
      if (cluster.length > 3) clusters.push(cluster);
    }
    if (clusters.length === 0) return null;
    const biggest = clusters.sort((a, b) => b.length - a.length)[0];
    const cx = biggest.reduce((s, [x]) => s + x, 0) / biggest.length;
    const cy = biggest.reduce((s, [, y]) => s + y, 0) / biggest.length;
    return { cx, cy, score: biggest.length };
  }

  /** 흰 픽셀 RANSAC 원 피팅 — 페이즈 1 반경 후보 안에서 최고 점수 원 채택. */
  private detectWhitePixelRANSAC(
    pixels: Buffer,
    size: number,
  ): { cx: number; cy: number; r: number; score: number } | null {
    const whitePoints: Array<[number, number]> = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 3;
        if (pixels[i] >= 220 && pixels[i + 1] >= 220 && pixels[i + 2] >= 220) {
          whitePoints.push([x, y]);
        }
      }
    }
    if (whitePoints.length < 30) return null;

    // 샘플링 (속도)
    const maxPts = 3000;
    let pts = whitePoints;
    if (pts.length > maxPts) {
      pts = [];
      const stride = Math.floor(whitePoints.length / maxPts);
      for (let i = 0; i < whitePoints.length; i += stride) pts.push(whitePoints[i]);
    }

    const rTargetPx = PUBG_PHASE_RADII[0] * size;
    const rMin = rTargetPx * 0.85;
    const rMax = rTargetPx * 1.15;

    const ITER = 500;
    let best: { cx: number; cy: number; r: number; score: number } | null = null;
    for (let t = 0; t < ITER; t++) {
      const p1 = pts[Math.floor(Math.random() * pts.length)];
      const p2 = pts[Math.floor(Math.random() * pts.length)];
      const p3 = pts[Math.floor(Math.random() * pts.length)];
      const circle = circleFromThreePoints(p1, p2, p3);
      if (!circle) continue;
      const { cx, cy, r } = circle;
      if (r < rMin || r > rMax) continue;
      if (cx < 0 || cx > size || cy < 0 || cy > size) continue;

      let score = 0;
      for (const [px, py] of pts) {
        const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        if (Math.abs(d - r) < 2.0) score++;
      }
      if (!best || score > best.score) {
        best = { cx, cy, r, score };
      }
    }
    // 점수가 너무 낮으면 신뢰 안 함 (우연한 후보)
    if (best && best.score < 30) return null;
    return best;
  }
}

/** 세 점으로 외접원 결정 (직선 위면 null). */
function circleFromThreePoints(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): { cx: number; cy: number; r: number } | null {
  const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
  const a = x2 - x1, b = y2 - y1, c = x3 - x1, d = y3 - y1;
  const e = a * (x1 + x2) + b * (y1 + y2);
  const f = c * (x1 + x3) + d * (y1 + y3);
  const g = 2 * (a * (y3 - y2) - b * (x3 - x2));
  if (Math.abs(g) < 1e-6) return null;
  const cx = (d * e - b * f) / g;
  const cy = (a * f - c * e) / g;
  const r = Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2);
  return { cx, cy, r };
}
