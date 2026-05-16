// 캡처 프레임에서 자기장 원의 중심·반경·페이즈를 추출하는 서비스
// 도메인 룰:
//   - 페이즈 1: 자기장 처음 생김. 외부 파란 거의 없음. 흰 원만 검출.
//   - 페이즈 2~8: 이전 자기장이 줄어들어 새 자기장이 그 안에 그려짐. 외부 항상 파란 채움.
//     색 전환(파란 ↔ 비파란) 픽셀이 자기장 둘레 = 가장 robust한 단서. 흰 색 의존 없음.
// 알고리즘:
//   1) 맵 영역(화면 중앙 정사각형) crop.
//   2) 파란 비율 측정 → 모드 분기.
//      - 파란 비율 < 5%: 흰 픽셀 RANSAC (페이즈 1 형성 직후 또는 wait 상태)
//      - 파란 비율 ≥ 5%: blue-edge RANSAC 우선, 실패 시 흰 픽셀 RANSAC 폴백
//      ※ 페이즈 1은 줄어들면서 파란이 0% → 누적되는 특수 상태. 5% 근처 진동 가능.
//   3) Cold start 후보는 [1,2,3,4]만. 페이즈 5~8은 hintPhase ±1로만 진입.
//   4) 흰 원 안 노란 점 마커가 있으면(blue-edge 모드) 정밀 중심 보정.
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

/** 페이즈별 최소 점수 — 반경 비례 + floor 200.
 * 페이즈 1: 800점 기준, 페이즈 4 이하는 floor 200 강제.
 * 외곽선 두께가 1px일 수 있어 40% 그라디언트는 진짜 자기장도 못 넘을 위험. 보수적 값 유지.
 * 페이즈 5~8 잡음 차단은 coldStartPhases [1,2,3,4] 후보 제한으로 1차 방어. */
function minScoreForPhase(phase: number): number {
  const baseScore = 800;
  const ratio = PUBG_PHASE_RADII[phase - 1] / PUBG_PHASE_RADII[0];
  return Math.max(200, Math.floor(baseScore * ratio));
}

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

  /**
   * @param hintPhase OCR이 단정한 현재 페이즈. 없으면 검출 skip.
   * @param parentCircle 이전 페이즈 락 (정규화 0~1). 있으면 흰/파란 픽셀 수집을 이 원 안으로 제한 +
   *                     검출 결과 원의 중심이 parentCircle 안에 있어야만 채택.
   */
  async extractCircle(
    base64: string,
    hintPhase?: number,
    parentCircle?: { x: number; y: number; r: number; phase?: number },
  ): Promise<CircleData | null> {
    const buffer = Buffer.from(base64, 'base64');
    const { data, info } = await sharp(buffer)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cropped = this.cropMapArea(data, info.width, info.height);
    const scale = 1.0;
    const blueRatio = this.measureBlueRatio(cropped.data, cropped.size);

    // 페이즈 후보 — OCR 게이트키퍼 아키텍처:
    // hintPhase 없으면 검출 안 함 (OCR이 페이즈 단정 못 했음 = 자기장 형성 안 됨).
    // hintPhase 있으면 그 페이즈 1개만 후보 (OCR 신뢰).
    if (!hintPhase) {
      this.logger.debug('hintPhase 없음 — OCR 미인식 상태. 검출 skip.');
      return null;
    }
    const phaseCandidates = [hintPhase];

    // parentCircle을 디스크 픽셀 좌표로 변환 (정규화 0~1 → 0~size).
    // 다음 페이즈는 이 원 안에서만 검색돼 잡음 매칭 차단 + 자연스러운 페이즈 N+1 ⊂ 페이즈 N 룰 강제.
    const parentInDisk = parentCircle
      ? {
          cx: parentCircle.x * cropped.size,
          cy: parentCircle.y * cropped.size,
          r: parentCircle.r * cropped.size,
        }
      : null;
    if (parentInDisk) {
      this.logger.debug(
        `parentCircle 제약: 디스크 좌표 cx=${parentInDisk.cx.toFixed(0)} cy=${parentInDisk.cy.toFixed(0)} r=${parentInDisk.r.toFixed(0)}`,
      );
    }

    let detection: DetectionCandidate | null;
    if (blueRatio >= 0.05) {
      detection = this.detectByBlueEdgeRANSAC(cropped.data, cropped.size, scale, phaseCandidates, parentInDisk);
      if (!detection) {
        detection = this.detectByWhitePixelRANSAC(cropped.data, cropped.size, scale, phaseCandidates, parentInDisk);
      }
    } else {
      detection = this.detectByWhitePixelRANSAC(cropped.data, cropped.size, scale, phaseCandidates, parentInDisk);
    }

    if (!detection) {
      this.logger.debug(
        `자기장 미검출 (파란 비율 ${(blueRatio * 100).toFixed(1)}%, 스케일 ${scale.toFixed(2)})`,
      );
      return null;
    }

    // 노란 점 마커는 페이즈 2~8(blue-edge 모드)에만 적용.
    // 페이즈 1은 외곽 자기장이라 그 안의 노란 마커가 잘못된 위치 끌어당김 (false positive 강화).
    const yellow = detection.mode === 'blue-edge'
      ? this.detectYellowMarkerInside(
          cropped.data, cropped.size,
          detection.cx, detection.cy, detection.r,
        )
      : null;
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

  /** PUBG 자기장 외부 파란 색 픽셀인지 판정 (반투명 진한 파랑).
   * 바다(청록) 제외: 자기장은 G가 R보다 크지 않거나 비슷, 바다는 G가 R보다 훨씬 큼.
   * 자기장: B가 G보다 명확히 큼 (b > g + 30). */
  private isBluePixel(r: number, g: number, b: number): boolean {
    return (
      b > r + 30 &&
      b > g + 30 &&
      b > 90 &&
      r < 130 &&
      g < r + 25 // 바다 제외 (바다는 G >> R)
    );
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

  /** 파란 외부 → 비파란 내부 전환 픽셀 RANSAC. 페이즈 후보 제한 가능 (hintPhase 지원).
   * parentCircle 있으면 그 안 픽셀만 수집. */
  private detectByBlueEdgeRANSAC(
    pixels: Buffer,
    size: number,
    scale: number,
    phasesAllowed: number[],
    parentInDisk: { cx: number; cy: number; r: number } | null,
  ): DetectionCandidate | null {
    const parentR2 = parentInDisk ? parentInDisk.r * parentInDisk.r : 0;
    const edgePoints: Array<[number, number]> = [];
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        if (parentInDisk) {
          const dx = x - parentInDisk.cx, dy = y - parentInDisk.cy;
          if (dx * dx + dy * dy > parentR2) continue;
        }
        const i = (y * size + x) * 3;
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        if (!this.isBluePixel(r, g, b)) continue;
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
    return this.runRansac(edgePoints, size, scale, 'blue-edge', phasesAllowed, parentInDisk);
  }

  /** 흰 픽셀 RANSAC. 페이즈 후보는 OCR이 단정한 단일 페이즈.
   * 임계값 220: 자기장 외곽선이 안티에일리어싱으로 220~240 범위. 그리드 라인 잡음은 OCR이 페이즈 1개로 좁혀줘 무력화.
   * parentCircle 있으면 그 안 픽셀만 수집. */
  private detectByWhitePixelRANSAC(
    pixels: Buffer,
    size: number,
    scale: number,
    phasesAllowed: number[],
    parentInDisk: { cx: number; cy: number; r: number } | null,
  ): DetectionCandidate | null {
    const parentR2 = parentInDisk ? parentInDisk.r * parentInDisk.r : 0;
    const whitePoints: Array<[number, number]> = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (parentInDisk) {
          const dx = x - parentInDisk.cx, dy = y - parentInDisk.cy;
          if (dx * dx + dy * dy > parentR2) continue;
        }
        const i = (y * size + x) * 3;
        if (pixels[i] >= 220 && pixels[i + 1] >= 220 && pixels[i + 2] >= 220) {
          whitePoints.push([x, y]);
        }
      }
    }
    if (whitePoints.length < 20) return null;
    return this.runRansac(whitePoints, size, scale, 'white', phasesAllowed, parentInDisk);
  }

  /** 공통 RANSAC 루프. 입력 점들 위에서 페이즈 후보 반경 중 가장 점수 높은 원 채택.
   * parentCircle 있으면 검출 결과 원의 중심도 parentCircle 안에 있어야 채택. */
  private runRansac(
    points: Array<[number, number]>,
    size: number,
    scale: number,
    mode: 'white' | 'blue-edge',
    phasesAllowed: number[],
    parentInDisk: { cx: number; cy: number; r: number } | null,
  ): DetectionCandidate | null {
    const maxPts = 3000;
    let pts = points;
    if (pts.length > maxPts) {
      pts = [];
      const stride = Math.floor(points.length / maxPts);
      for (let i = 0; i < points.length; i += stride) pts.push(points[i]);
    }

    // tolerance ±12% — ±20%는 너무 헐거워 다른 페이즈와 겹치고 잡음 매칭 허용함.
    // PUBG 자기장은 정해진 r에서 정밀하게 표시되므로 ±12%면 충분.
    const phaseExpects = phasesAllowed.map((p) => {
      const rExpected = PUBG_PHASE_RADII[p - 1] * size * scale;
      return {
        phase: p,
        rExpected,
        rMin: rExpected * 0.88,
        rMax: rExpected * 1.12,
      };
    });

    // ITER 2000 — 800은 페이즈 2~3 작은 원 (자기장 픽셀 적음)에서 진짜 3점 못 뽑힘.
    const ITER = 2000;
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
    // parentCircle 제약: 검출 결과 원의 중심도 parentCircle 안에 있어야 채택.
    // 다음 페이즈는 무조건 이전 페이즈 자기장 안에 형성됨 (PUBG 룰).
    if (parentInDisk) {
      const dx = best.cx - parentInDisk.cx, dy = best.cy - parentInDisk.cy;
      if (dx * dx + dy * dy > parentInDisk.r * parentInDisk.r) {
        this.logger.debug(
          `검출 결과 중심이 parentCircle 밖 → 폐기. ` +
          `결과 (${best.cx.toFixed(0)},${best.cy.toFixed(0)}) parent (${parentInDisk.cx.toFixed(0)},${parentInDisk.cy.toFixed(0)} r=${parentInDisk.r.toFixed(0)})`,
        );
        return null;
      }
    }
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
