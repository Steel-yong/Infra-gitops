// 캡처 프레임에서 자기장 원의 중심·반경·페이즈를 추출하는 서비스
// 도메인 룰:
//   - 페이즈 1: 자기장 처음 생김. 외부 파란 거의 없음. 흰 원만 검출.
//   - 페이즈 2~8: 이전 자기장이 줄어들어 새 자기장이 그 안에 그려짐. 외부 항상 파란 채움.
//     색 전환(파란 ↔ 비파란) 픽셀이 자기장 둘레 = 가장 robust한 단서. 흰 색 의존 없음.
// 알고리즘:
//   1) 맵 영역(화면 중앙 정사각형) crop.
//   2) 격자선 검출 → 확대 비율 추정 (실패 시 1.0).
//   3) 파란 비율 측정 → 모드 분기.
//      - 파란 비율 < 5%: 페이즈 1 모드 (흰 픽셀 RANSAC, 페이즈 1 반경 한정)
//      - 파란 비율 ≥ 5%: 페이즈 2~8 모드 (파란 경계 RANSAC, 모든 페이즈 후보)
//   4) 흰 원 안 노란 점 마커가 있으면 정밀 중심 보정.
//   5) 정규화 좌표는 맵 영역 한 변 기준.
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';

/** PUBG 페이즈별 자기장 반경 비율 (radius_m / 8160m)
 * 출처: PUBG 공식 페이즈 데이터 표 (지름·축소 비율 자기 검증됨)
 * 분모 8160m = documentation.pubg.com/en/telemetry-objects.html */
const PUBG_PHASE_RADII = [
  0.24474, // phase 1: 1997.05m
  0.13461, // phase 2: 1098.40m
  0.07403, // phase 3: 604.10m
  0.04072, // phase 4: 332.25m
  0.02036, // phase 5: 166.15m
  0.01018, // phase 6: 83.05m
  0.00509, // phase 7: 41.55m
  0.00254, // phase 8: 20.75m
] as const;

/** 페이즈별 최소 점수 — 반경 비례. 너무 작은 페이즈는 false positive 방지 floor 12점. */
function minScoreForPhase(phase: number): number {
  const baseScore = 200;
  const ratio = PUBG_PHASE_RADII[phase - 1] / PUBG_PHASE_RADII[0];
  return Math.max(12, Math.floor(baseScore * ratio));
}

const SCALE_MIN = 0.7;
const SCALE_MAX = 3.0;

interface CropArea {
  data: Buffer;
  size: number;
  offsetX: number;
  offsetY: number;
}

interface DetectionCandidate {
  phase: number;
  cx: number;
  cy: number;
  r: number;
  rExpected: number;
  score: number;
  mode: 'white' | 'blue-edge';
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

    const cropped = this.cropMapArea(data, info.width, info.height);
    const scale = this.detectMapScale(cropped.data, cropped.size) ?? 1.0;
    const blueRatio = this.measureBlueRatio(cropped.data, cropped.size);

    // 모드 분기 — 도메인 룰
    let detection: DetectionCandidate | null;
    if (blueRatio >= 0.05) {
      // 페이즈 2~8 모드 — 외부 파란 있음
      detection = this.detectByBlueEdgeRANSAC(cropped.data, cropped.size, scale);
      // 페이즈 1 흰 원 RANSAC도 시도 — 페이즈 1 줄어드는 중에 외부 파란 일부 보일 수 있음
      if (!detection) {
        detection = this.detectByWhitePixelRANSAC(cropped.data, cropped.size, scale, [1]);
      }
    } else {
      // 페이즈 1 모드 — 외부 파란 없음
      detection = this.detectByWhitePixelRANSAC(cropped.data, cropped.size, scale, [1]);
    }

    if (!detection) {
      this.logger.debug(
        `자기장 미검출 (파란 비율 ${(blueRatio * 100).toFixed(1)}%, 스케일 ${scale.toFixed(2)})`,
      );
      return null;
    }

    // 노란 점 마커가 자기장 안에 있으면 정밀 중심 보정
    const yellow = this.detectYellowMarkerInside(
      cropped.data, cropped.size,
      detection.cx, detection.cy, detection.r,
    );
    const cx = yellow ? yellow.cx : detection.cx;
    const cy = yellow ? yellow.cy : detection.cy;
    const rNorm = PUBG_PHASE_RADII[detection.phase - 1];

    this.logger.log(
      `자기장 검출 [${detection.mode}]: 페이즈 ${detection.phase} ` +
      `center=(${(cx / cropped.size).toFixed(3)}, ${(cy / cropped.size).toFixed(3)}) ` +
      `r=${detection.r.toFixed(0)}px(기대 ${detection.rExpected.toFixed(0)}px) ` +
      `점수=${detection.score} 파란=${(blueRatio * 100).toFixed(0)}% 스케일=${scale.toFixed(2)}× ` +
      `${yellow ? `마커 보정(${yellow.score}px)` : ''}`,
    );

    return {
      x: cx / cropped.size,
      y: cy / cropped.size,
      r: rNorm,
      phase: detection.phase,
    };
  }

  /** 화면 중앙 정사각형 crop. */
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

  /** PUBG 자기장 외부 파란 색 픽셀인지 판정 (반투명 진한 파랑). */
  private isBluePixel(r: number, g: number, b: number): boolean {
    return b > r + 25 && b > g + 10 && b > 80 && r < 140;
  }

  /** 파란 픽셀 비율 (4픽셀 stride 샘플링). */
  private measureBlueRatio(pixels: Buffer, size: number): number {
    let blue = 0, total = 0;
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const i = (y * size + x) * 3;
        total++;
        if (this.isBluePixel(pixels[i], pixels[i + 1], pixels[i + 2])) blue++;
      }
    }
    return total ? blue / total : 0;
  }

  /** 격자선 간격으로 확대 비율 추정. */
  private detectMapScale(pixels: Buffer, size: number): number | null {
    const rowDarkness: number[] = new Array(size).fill(0);
    for (let y = 0; y < size; y++) {
      let count = 0;
      for (let x = 0; x < size; x += 4) {
        const i = (y * size + x) * 3;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const gray = (r + g + b) / 3;
        if (gray > 130 && gray < 220 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
          count++;
        }
      }
      rowDarkness[y] = count;
    }
    const mean = rowDarkness.reduce((s, v) => s + v, 0) / size;
    const variance = rowDarkness.reduce((s, v) => s + (v - mean) ** 2, 0) / size;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 1.5 * stddev;
    const lineRows: number[] = [];
    for (let y = 0; y < size; y++) if (rowDarkness[y] > threshold) lineRows.push(y);
    if (lineRows.length < 4) return null;

    const gaps: number[] = [];
    let lastY = lineRows[0];
    for (let i = 1; i < lineRows.length; i++) {
      const gap = lineRows[i] - lastY;
      if (gap > size * 0.05) { gaps.push(gap); lastY = lineRows[i]; }
    }
    if (gaps.length < 2) return null;

    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    const scale = (size / 8) / median;
    if (scale < SCALE_MIN || scale > SCALE_MAX) return null;
    return scale;
  }

  /** 파란 외부 → 비파란 내부 전환 픽셀 RANSAC. 페이즈 1~8 후보, 모든 페이즈에 robust. */
  private detectByBlueEdgeRANSAC(
    pixels: Buffer,
    size: number,
    scale: number,
  ): DetectionCandidate | null {
    const edgePoints: Array<[number, number]> = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = (y * size + x) * 3;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (!this.isBluePixel(r, g, b)) continue;
        // 인접 4픽셀 중 하나라도 비파란이면 = 자기장 경계
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const ni = ((y + dy) * size + (x + dx)) * 3;
          if (!this.isBluePixel(pixels[ni], pixels[ni + 1], pixels[ni + 2])) {
            edgePoints.push([x, y]);
            break;
          }
        }
      }
    }
    if (edgePoints.length < 20) return null;
    return this.runRansac(edgePoints, size, scale, 'blue-edge', [1, 2, 3, 4, 5, 6, 7, 8]);
  }

  /** 흰 픽셀 RANSAC. 페이즈 후보 제한 가능 (페이즈 1 cold start). */
  private detectByWhitePixelRANSAC(
    pixels: Buffer,
    size: number,
    scale: number,
    phasesAllowed: number[],
  ): DetectionCandidate | null {
    const whitePoints: Array<[number, number]> = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 3;
        if (pixels[i] >= 220 && pixels[i + 1] >= 220 && pixels[i + 2] >= 220) {
          whitePoints.push([x, y]);
        }
      }
    }
    if (whitePoints.length < 20) return null;
    return this.runRansac(whitePoints, size, scale, 'white', phasesAllowed);
  }

  /** 공통 RANSAC 루프. 입력 점들 위에서 페이즈 후보 반경 중 가장 점수 높은 원 채택. */
  private runRansac(
    points: Array<[number, number]>,
    size: number,
    scale: number,
    mode: 'white' | 'blue-edge',
    phasesAllowed: number[],
  ): DetectionCandidate | null {
    const maxPts = 3000;
    let pts = points;
    if (pts.length > maxPts) {
      pts = [];
      const stride = Math.floor(points.length / maxPts);
      for (let i = 0; i < points.length; i += stride) pts.push(points[i]);
    }

    const phaseExpects = phasesAllowed.map((p) => {
      const rExpected = PUBG_PHASE_RADII[p - 1] * size * scale;
      return {
        phase: p,
        rExpected,
        rMin: rExpected * 0.80,
        rMax: rExpected * 1.20,
      };
    });

    const ITER = 800;
    let best: DetectionCandidate | null = null;
    for (let t = 0; t < ITER; t++) {
      const p1 = pts[Math.floor(Math.random() * pts.length)];
      const p2 = pts[Math.floor(Math.random() * pts.length)];
      const p3 = pts[Math.floor(Math.random() * pts.length)];
      const circle = circleFromThreePoints(p1, p2, p3);
      if (!circle) continue;
      const { cx, cy, r } = circle;
      if (cx < 0 || cx > size || cy < 0 || cy > size) continue;

      let matchedPhase = -1;
      let matchedExpected = -1;
      for (const pe of phaseExpects) {
        if (r >= pe.rMin && r <= pe.rMax) {
          matchedPhase = pe.phase;
          matchedExpected = pe.rExpected;
          break;
        }
      }
      if (matchedPhase === -1) continue;

      let score = 0;
      for (const [px, py] of pts) {
        const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        if (Math.abs(d - r) < 2.0) score++;
      }

      if (!best || score > best.score) {
        best = { phase: matchedPhase, cx, cy, r, rExpected: matchedExpected, score, mode };
      }
    }
    if (!best) return null;
    if (best.score < minScoreForPhase(best.phase)) return null;
    return best;
  }

  /** 노란 점 마커 (자기장 안). */
  private detectYellowMarkerInside(
    pixels: Buffer,
    size: number,
    circleCx: number,
    circleCy: number,
    circleR: number,
  ): { cx: number; cy: number; score: number } | null {
    const maxDist = circleR * 0.9;
    const yellowPoints: Array<[number, number]> = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - circleCx, dy = y - circleCy;
        if (dx * dx + dy * dy > maxDist * maxDist) continue;
        const i = (y * size + x) * 3;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (r >= 200 && g >= 180 && b <= 100) yellowPoints.push([x, y]);
      }
    }
    if (yellowPoints.length < 5) return null;

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
          if (yellowSet.has(nk) && !visited.has(nk)) queue.push([x + dx, y + dy]);
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
}

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
