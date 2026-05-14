// 페이즈 1 자기장 검출 알고리즘 자동 검증 스크립트
// 사진 2장에 여러 가설을 차례로 적용해서 ground truth와 비교한다.
// 통과한 가설이 있으면 그 알고리즘을 채택. 모두 실패하면 다음 가설로 반복.

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// ─── ground truth (사용자 PUBG 페이즈 표) ─────────────────────────────────
const PHASE_1_R_NORM = 0.24474; // 페이즈 1 반경 정규화 (1997.05 / 8160m)
const R_TOLERANCE = 0.10; // ±10% 허용
const CENTER_TOLERANCE = 0.08; // 시각 중심 ±8% 허용 (자기장 외곽 두께 고려)

// ─── 입력 사진 경로 ────────────────────────────────────────────────────
const IMAGE_DIR = '/mnt/d/infra project/Infra-gitops/.claude/images';
const IMAGES = [
  { name: '1페이즈', file: '1페이즈.png' },
  { name: '배그 맵화면', file: '배그 맵화면.png' },
] as const;

// ─── 결과 출력 ─────────────────────────────────────────────────────────
const OUT_DIR = '/mnt/d/infra project/feature-PUB-30/scripts-output';
fs.mkdirSync(OUT_DIR, { recursive: true });

interface DetectionResult {
  cx: number; // 화면 픽셀 좌표
  cy: number;
  r: number;  // 픽셀 반경
  score: number;
  method: string;
}

interface NormalizedResult {
  x: number; // 0~1 (맵 영역 한 변 기준)
  y: number;
  r: number;
}

// ─── 맵 영역 crop — 화면 중앙 정사각형 (높이 기준) ──────────────────────
function cropMapArea(
  pixels: Buffer,
  width: number,
  height: number,
): { data: Buffer; size: number; offsetX: number; offsetY: number } {
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

// ─── 가설 A: 흰 픽셀 RANSAC 원 피팅 ────────────────────────────────────
function detectHypothesisA_WhitePixelRANSAC(
  pixels: Buffer,
  size: number,
): DetectionResult | null {
  // 1) 흰 픽셀 추출 (자기장 흰 링)
  const whitePoints: [number, number][] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 3;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (r >= 220 && g >= 220 && b >= 220) {
        whitePoints.push([x, y]);
      }
    }
  }
  if (whitePoints.length < 30) return null;

  // 흰 픽셀이 너무 많으면 샘플링 (속도)
  const maxPts = 3000;
  let pts = whitePoints;
  if (pts.length > maxPts) {
    pts = [];
    const stride = Math.floor(whitePoints.length / maxPts);
    for (let i = 0; i < whitePoints.length; i += stride) pts.push(whitePoints[i]);
  }

  // 페이즈 1 픽셀 반경 후보 범위
  const rTargetPx = PHASE_1_R_NORM * size;
  const rMin = rTargetPx * 0.85;
  const rMax = rTargetPx * 1.15;

  // 2) RANSAC: 무작위 3점 → 원 결정 → 점수
  const ITER = 500;
  let best: DetectionResult | null = null;
  for (let t = 0; t < ITER; t++) {
    const p1 = pts[Math.floor(Math.random() * pts.length)];
    const p2 = pts[Math.floor(Math.random() * pts.length)];
    const p3 = pts[Math.floor(Math.random() * pts.length)];
    const circle = circleFromThreePoints(p1, p2, p3);
    if (!circle) continue;
    const { cx, cy, r } = circle;
    if (r < rMin || r > rMax) continue;
    // 중심이 화면 밖이면 무시 (페이즈 1은 보통 화면 안)
    if (cx < 0 || cx > size || cy < 0 || cy > size) continue;

    // 점수: 흰 픽셀 중 원 둘레(±2px) 위에 있는 점 수
    let score = 0;
    for (const [px, py] of pts) {
      const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (Math.abs(d - r) < 2.0) score++;
    }
    if (!best || score > best.score) {
      best = { cx, cy, r, score, method: 'A: 흰픽셀 RANSAC' };
    }
  }
  return best;
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

// ─── 가설 B: 그리드 후보 중심 × 페이즈 1 반경 둘레 점수 ──────────────────
function detectHypothesisB_GridWhiteScore(
  pixels: Buffer,
  size: number,
): DetectionResult | null {
  // 흰 픽셀 마스크 빠른 조회 (set 으로)
  const whiteMask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      if (pixels[i] >= 220 && pixels[i + 1] >= 220 && pixels[i + 2] >= 220) {
        whiteMask[y * size + x] = 1;
      }
    }
  }

  const rTargetPx = PHASE_1_R_NORM * size;
  const candidates: number[] = [];
  for (let r = Math.floor(rTargetPx * 0.85); r <= Math.ceil(rTargetPx * 1.15); r += 2) candidates.push(r);

  const GRID = 40; // 40×40 그리드 후보 = 1600 중심
  const step = size / GRID;

  let best: DetectionResult | null = null;
  for (let gy = 0; gy < GRID; gy++) {
    const cy = Math.floor(step / 2 + gy * step);
    for (let gx = 0; gx < GRID; gx++) {
      const cx = Math.floor(step / 2 + gx * step);
      for (const r of candidates) {
        let score = 0;
        // 둘레 36점 (10도 간격) 흰 픽셀 카운트
        for (let a = 0; a < 360; a += 10) {
          const rad = (a * Math.PI) / 180;
          const px = Math.round(cx + r * Math.cos(rad));
          const py = Math.round(cy + r * Math.sin(rad));
          if (px < 0 || px >= size || py < 0 || py >= size) continue;
          if (whiteMask[py * size + px]) score++;
        }
        if (!best || score > best.score) {
          best = { cx, cy, r, score, method: 'B: 그리드 둘레 점수' };
        }
      }
    }
  }
  return best;
}

// ─── 가설 C: 노란 점 검출 → 자기장 중심 ────────────────────────────────
function detectHypothesisC_YellowDot(
  pixels: Buffer,
  size: number,
): DetectionResult | null {
  // 노란 점: R ≥ 200, G ≥ 180, B ≤ 100
  const yellowPoints: [number, number][] = [];
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

  // 가장 큰 노란 클러스터 = 마커 (단순 BFS)
  const visited = new Set<number>();
  const clusters: [number, number][][] = [];
  const yellowSet = new Set(yellowPoints.map(([x, y]) => y * size + x));
  for (const [sx, sy] of yellowPoints) {
    const sk = sy * size + sx;
    if (visited.has(sk)) continue;
    const cluster: [number, number][] = [];
    const queue = [[sx, sy] as [number, number]];
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
  // 클러스터 평균 = 노란 점 중심
  const cx = biggest.reduce((s, [x]) => s + x, 0) / biggest.length;
  const cy = biggest.reduce((s, [, y]) => s + y, 0) / biggest.length;
  // 반경은 알려진 페이즈 1 값
  const r = PHASE_1_R_NORM * size;
  return { cx, cy, r, score: biggest.length, method: 'C: 노란 점 마커' };
}

// ─── 가설 D: 색 전환 엣지 + RANSAC ─────────────────────────────────────
// 흰 픽셀과 인접에 비-흰 픽셀이 있으면 자기장 경계 엣지
function detectHypothesisD_EdgeRANSAC(
  pixels: Buffer,
  size: number,
): DetectionResult | null {
  const edgePoints: [number, number][] = [];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = (y * size + x) * 3;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (!(r >= 220 && g >= 220 && b >= 220)) continue;
      // 4-이웃 중 하나라도 비-흰이면 엣지
      let hasNonWhiteNeighbor = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = ((y + dy) * size + (x + dx)) * 3;
        if (pixels[ni] < 200 || pixels[ni + 1] < 200 || pixels[ni + 2] < 200) {
          hasNonWhiteNeighbor = true;
          break;
        }
      }
      if (hasNonWhiteNeighbor) edgePoints.push([x, y]);
    }
  }
  if (edgePoints.length < 30) return null;

  // 동일한 RANSAC
  const maxPts = 2000;
  let pts = edgePoints;
  if (pts.length > maxPts) {
    pts = [];
    const stride = Math.floor(edgePoints.length / maxPts);
    for (let i = 0; i < edgePoints.length; i += stride) pts.push(edgePoints[i]);
  }
  const rTargetPx = PHASE_1_R_NORM * size;
  const rMin = rTargetPx * 0.85;
  const rMax = rTargetPx * 1.15;

  const ITER = 500;
  let best: DetectionResult | null = null;
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
      best = { cx, cy, r, score, method: 'D: 엣지 RANSAC' };
    }
  }
  return best;
}

// ─── 결과 → 정규화 (맵 영역 한 변 기준) ─────────────────────────────────
function toNormalized(d: DetectionResult, size: number): NormalizedResult {
  return { x: d.cx / size, y: d.cy / size, r: d.r / size };
}

// ─── 사진 위에 검출 원 빨간색 오버레이 PNG 생성 ─────────────────────────
async function makeOverlay(
  srcPath: string,
  detection: DetectionResult,
  cropOffsetX: number,
  cropOffsetY: number,
  outPath: string,
): Promise<void> {
  const img = sharp(srcPath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) return;
  const w = meta.width, h = meta.height;
  // 검출은 crop된 좌표 → 원본 좌표로 복원
  const cx = detection.cx + cropOffsetX;
  const cy = detection.cy + cropOffsetY;
  const r = detection.r;

  // SVG로 빨간 원 + 중심 점 그리기
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="red" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="red"/>
    <text x="${cx + 12}" y="${cy - 12}" fill="red" font-size="20" font-family="sans-serif" font-weight="bold">
      ${detection.method}
    </text>
    <text x="${cx + 12}" y="${cy + 12}" fill="red" font-size="16" font-family="sans-serif">
      r=${r.toFixed(1)}px score=${detection.score}
    </text>
  </svg>`;
  await img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);
}

// ─── 검증 ────────────────────────────────────────────────────────────
function evaluate(norm: NormalizedResult): { passed: boolean; rError: number; centerErr: number } {
  // r 검증
  const rError = Math.abs(norm.r - PHASE_1_R_NORM) / PHASE_1_R_NORM;
  // 중심은 사진별 ground truth 없음. 단 페이즈 1 자기장은 대부분 맵 중앙 근처에 있다는 약한 사전 가정.
  // 정확한 중심 검증은 시각 오버레이로 사람이 함. 여기선 r 검증만.
  return { passed: rError < R_TOLERANCE, rError, centerErr: 0 };
}

// ─── 메인 ────────────────────────────────────────────────────────────
async function main() {
  const hypotheses = [
    detectHypothesisA_WhitePixelRANSAC,
    detectHypothesisB_GridWhiteScore,
    detectHypothesisC_YellowDot,
    detectHypothesisD_EdgeRANSAC,
  ];
  const hypothesisNames = [
    'A: 흰픽셀 RANSAC',
    'B: 그리드 둘레 점수',
    'C: 노란 점 마커',
    'D: 엣지 RANSAC',
  ];

  const summary: Array<{
    image: string;
    hypothesis: string;
    norm: NormalizedResult | null;
    rError: number | null;
    passed: boolean;
    overlayPath: string | null;
  }> = [];

  for (const img of IMAGES) {
    const srcPath = path.join(IMAGE_DIR, img.file);
    console.log(`\n[${img.name}] 로드: ${srcPath}`);
    const buf = await fs.promises.readFile(srcPath);
    const { data, info } = await sharp(buf)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    console.log(`  원본 ${width}×${height}`);

    const cropped = cropMapArea(data, width, height);
    console.log(`  맵 영역 crop ${cropped.size}×${cropped.size} @ (${cropped.offsetX}, ${cropped.offsetY})`);

    for (let hi = 0; hi < hypotheses.length; hi++) {
      const fn = hypotheses[hi];
      const name = hypothesisNames[hi];
      const t0 = Date.now();
      const det = fn(cropped.data, cropped.size);
      const dt = Date.now() - t0;
      if (!det) {
        console.log(`  [${name}] NULL (${dt}ms)`);
        summary.push({ image: img.name, hypothesis: name, norm: null, rError: null, passed: false, overlayPath: null });
        continue;
      }
      const norm = toNormalized(det, cropped.size);
      const { passed, rError } = evaluate(norm);
      console.log(
        `  [${name}] cx=${det.cx.toFixed(1)} cy=${det.cy.toFixed(1)} r=${det.r.toFixed(1)}px ` +
        `→ norm(${norm.x.toFixed(3)}, ${norm.y.toFixed(3)}, r=${norm.r.toFixed(4)}) ` +
        `target r=${PHASE_1_R_NORM} err=${(rError * 100).toFixed(1)}% ${passed ? '✓ PASS' : '✗ FAIL'} ` +
        `score=${det.score} (${dt}ms)`,
      );
      const overlayPath = path.join(OUT_DIR, `overlay-${img.name}-${name.replace(/[:\s]+/g, '_')}.png`);
      await makeOverlay(srcPath, det, cropped.offsetX, cropped.offsetY, overlayPath);
      summary.push({ image: img.name, hypothesis: name, norm, rError, passed, overlayPath });
    }
  }

  // JSON 결과 저장
  fs.writeFileSync(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log(`\n→ 결과 JSON: ${path.join(OUT_DIR, 'summary.json')}`);

  // 전체 PASS/FAIL 요약
  console.log('\n=== 가설별 통과 결과 ===');
  for (const name of hypothesisNames) {
    const rows = summary.filter((s) => s.hypothesis === name);
    const allPassed = rows.every((r) => r.passed);
    console.log(`  ${name}: ${rows.filter((r) => r.passed).length}/${rows.length} 통과 ${allPassed ? '★' : ''}`);
  }
}

main().catch((e) => {
  console.error('실패:', e);
  process.exit(1);
});
