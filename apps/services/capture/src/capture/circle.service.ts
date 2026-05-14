// 캡처 프레임에서 자기장 원의 중심·반경·페이즈를 추출하는 서비스
// 접근법:
//   1) 맵 영역 crop (화면 중앙 정사각형, 높이 기준).
//   2) 격자선 검출로 확대 비율 추정 (격자 한 칸 = 1km, 맵 8칸). 실패하면 1.0 가정.
//   3) 흰 픽셀 RANSAC을 페이즈 1~8 후보 반경(확대 비율 반영) 위에서 통합 검색.
//      검출 원의 반경이 어느 페이즈와 가장 일치하는지 자동 분류.
//   4) 페이즈별 점수 임계값 (반경 비례) 미달하면 null — 자기장이 화면에 없음.
//   5) 흰 원 안에서 노란 점 마커(다음 자기장 중심)가 있으면 정밀 중심 보정.
//   6) 정규화 좌표는 맵 영역 한 변 기준 (Leaflet CRS.Simple과 일치).
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
] as const;

/** 페이즈별 최소 점수 — 둘레 픽셀 양 비례. 페이즈 1이 200점일 때 페이즈 N은 r 비율로 스케일.
 * 다만 너무 작은 페이즈는 false positive 위험 큼 → 최소 12점 floor. */
function minScoreForPhase(phase: number): number {
  const baseScore = 200; // phase 1 기준
  const ratio = PUBG_PHASE_RADII[phase - 1] / PUBG_PHASE_RADII[0];
  return Math.max(12, Math.floor(baseScore * ratio));
}

/** 확대 비율 후보 범위. 사용자는 보통 1배(전체맵) ~ 3배(페이즈 후반) 정도 확대. */
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
  r: number;        // 픽셀 반경
  rExpected: number; // 페이즈 + 스케일 기대 반경
  score: number;
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

    // 1) 맵 영역 crop
    const cropped = this.cropMapArea(data, info.width, info.height);

    // 2) 격자선 검출로 확대 비율 추정 (실패 시 1.0)
    const scale = this.detectMapScale(cropped.data, cropped.size) ?? 1.0;

    // 3) 통합 RANSAC — 페이즈 1~8 후보, 확대 반영 반경
    const detection = this.detectAnyPhaseRANSAC(cropped.data, cropped.size, scale);
    if (!detection) {
      this.logger.debug(`자기장 미검출 (스케일 ${scale.toFixed(2)})`);
      return null;
    }

    // 4) 흰 원 안 노란 점 마커 검출 → 정밀 중심 보정
    const yellow = this.detectYellowMarkerInside(
      cropped.data, cropped.size,
      detection.cx, detection.cy, detection.r,
    );
    const cx = yellow ? yellow.cx : detection.cx;
    const cy = yellow ? yellow.cy : detection.cy;

    // 5) 정규화 — 확대 비율 보정. 페이즈 N의 정규화 r 그대로 사용.
    //    중심은 화면 좌표 / cropSize 그대로 (확대 시 화면 좌표가 맵 일부분 → Map Registration 별도 필요).
    const rNorm = PUBG_PHASE_RADII[detection.phase - 1];

    this.logger.log(
      `자기장 검출: 페이즈 ${detection.phase} center=(${(cx / cropped.size).toFixed(3)}, ${(cy / cropped.size).toFixed(3)}) ` +
      `r=${detection.r.toFixed(0)}px(기대 ${detection.rExpected.toFixed(0)}px) 점수=${detection.score} 스케일=${scale.toFixed(2)}× ` +
      `${yellow ? `노란 마커 보정(${yellow.score}px)` : '마커 없음'}`,
    );

    return {
      x: cx / cropped.size,
      y: cy / cropped.size,
      r: rNorm,
      phase: detection.phase,
    };
  }

  /** 화면 중앙 정사각형(높이 기준) crop. */
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

  /** 격자선 간격으로 확대 비율 추정.
   *  PUBG 1km 격자(맵 8칸). 확대 안 한 경우 = 격자 한 칸 = size/8 픽셀.
   *  격자선이 흐릿하거나 자기장에 묻혀 검출 못하면 null 반환 (호출자가 1.0 사용). */
  private detectMapScale(pixels: Buffer, size: number): number | null {
    // 수평 격자선 후보 — 각 y행마다 "회색 직선 신호"를 측정
    // 격자선은 흰색 가깝거나 회색(160~200), 가로로 일관된 픽셀 패턴
    const rowDarkness: number[] = new Array(size).fill(0);
    for (let y = 0; y < size; y++) {
      let count = 0;
      // 표본 추출 (속도)
      for (let x = 0; x < size; x += 4) {
        const i = (y * size + x) * 3;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const gray = (r + g + b) / 3;
        // 격자선 색 범위 (밝은 회색~흰색, 채도 낮음)
        if (gray > 130 && gray < 220 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) {
          count++;
        }
      }
      rowDarkness[y] = count;
    }
    // 평균 위 1.5σ 이상인 행 = 격자선 후보
    const mean = rowDarkness.reduce((s, v) => s + v, 0) / size;
    const variance = rowDarkness.reduce((s, v) => s + (v - mean) ** 2, 0) / size;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 1.5 * stddev;
    const lineRows: number[] = [];
    for (let y = 0; y < size; y++) {
      if (rowDarkness[y] > threshold) lineRows.push(y);
    }
    if (lineRows.length < 4) return null;

    // 인접 격자선 간격 측정 (인접 라인 그룹화)
    const gaps: number[] = [];
    let lastY = lineRows[0];
    for (let i = 1; i < lineRows.length; i++) {
      const gap = lineRows[i] - lastY;
      if (gap > size * 0.05) { // 격자 한 칸 최소 5% (너무 가까운 라인은 같은 격자선의 안티엘리어싱)
        gaps.push(gap);
        lastY = lineRows[i];
      }
    }
    if (gaps.length < 2) return null;

    // 가장 흔한 간격 = 격자 한 칸
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    const expectedGapNoZoom = size / 8;
    const scale = expectedGapNoZoom / median;

    // 합리적 확대 비율인지 검증
    if (scale < SCALE_MIN || scale > SCALE_MAX) return null;
    return scale;
  }

  /** 통합 RANSAC — 페이즈 1~8 후보 위에서 가장 강한 원 채택.
   *  scale: 확대 비율 (1.0 = 원본 크기, 2.0 = 2배 확대) */
  private detectAnyPhaseRANSAC(
    pixels: Buffer,
    size: number,
    scale: number,
  ): DetectionCandidate | null {
    // 흰 픽셀 추출
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

    const maxPts = 3000;
    let pts = whitePoints;
    if (pts.length > maxPts) {
      pts = [];
      const stride = Math.floor(whitePoints.length / maxPts);
      for (let i = 0; i < whitePoints.length; i += stride) pts.push(whitePoints[i]);
    }

    // 페이즈별 (r 기대값, r 범위) 사전 계산 — 확대 반영
    const phaseExpects = PUBG_PHASE_RADII.map((rn, i) => {
      const rExpected = rn * size * scale;
      return {
        phase: i + 1,
        rExpected,
        rMin: rExpected * 0.80, // 페이즈 후반은 r가 작아 변동에 민감 → 살짝 넉넉히
        rMax: rExpected * 1.20,
        minScore: minScoreForPhase(i + 1),
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

      // 화면 안 중심만
      if (cx < 0 || cx > size || cy < 0 || cy > size) continue;

      // 어느 페이즈 후보에 속하는지
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

      // 점수 — 둘레 ±2px 위 흰 픽셀 수
      let score = 0;
      for (const [px, py] of pts) {
        const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
        if (Math.abs(d - r) < 2.0) score++;
      }

      if (!best || score > best.score) {
        best = { phase: matchedPhase, cx, cy, r, rExpected: matchedExpected, score };
      }
    }

    if (!best) return null;
    const required = minScoreForPhase(best.phase);
    if (best.score < required) {
      return null;
    }
    return best;
  }

  /** 노란 점 마커 검출 (자기장 원 안쪽에서만). */
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
        if (r >= 200 && g >= 180 && b <= 100) {
          yellowPoints.push([x, y]);
        }
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
