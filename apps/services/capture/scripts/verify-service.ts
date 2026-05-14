// 실제 CircleService 인스턴스를 사용해서 사진 2장에 페이즈 1 검출 검증
// 검증 기준: r 정규화 0.24474 ±10%, phase=1, 시각 중심이 ground truth 흰 원과 일치

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { CircleService } from '../src/capture/circle.service';

const PHASE_1_R = 0.24474;
const R_TOLERANCE = 0.10;
const IMAGE_DIR = '/mnt/d/infra project/Infra-gitops/.claude/images';
const OUT_DIR = '/mnt/d/infra project/feature-PUB-30/scripts-output';

const IMAGES = [
  { name: '1페이즈', file: '1페이즈.png' },
  { name: '배그 맵화면', file: '배그 맵화면.png' },
] as const;

async function makeServiceOverlay(
  srcPath: string,
  width: number,
  height: number,
  cropOffsetX: number,
  result: { x: number; y: number; r: number; phase?: number },
  outPath: string,
): Promise<void> {
  const size = height;
  const cxCrop = result.x * size;
  const cyCrop = result.y * size;
  const rPx = result.r * size;
  const cx = cxCrop + cropOffsetX;
  const cy = cyCrop;
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${rPx}" fill="none" stroke="lime" stroke-width="4"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="lime"/>
    <text x="${cx + 12}" y="${cy - 12}" fill="lime" font-size="22" font-family="sans-serif" font-weight="bold">
      CircleService 페이즈 ${result.phase}
    </text>
    <text x="${cx + 12}" y="${cy + 14}" fill="lime" font-size="16" font-family="sans-serif">
      r=${result.r.toFixed(4)} center=(${result.x.toFixed(3)}, ${result.y.toFixed(3)})
    </text>
  </svg>`;
  await sharp(srcPath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);
}

async function main() {
  const service = new CircleService();
  const results: Array<{
    image: string;
    detected: boolean;
    x?: number;
    y?: number;
    r?: number;
    phase?: number;
    rErrPct?: number;
    passed: boolean;
    overlayPath?: string;
  }> = [];

  for (const img of IMAGES) {
    const srcPath = path.join(IMAGE_DIR, img.file);
    console.log(`\n[${img.name}]`);
    const buf = await fs.promises.readFile(srcPath);
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height) {
      console.log('  메타데이터 없음');
      continue;
    }
    const base64 = buf.toString('base64');
    const t0 = Date.now();
    const result = await service.extractCircle(base64);
    const dt = Date.now() - t0;
    if (!result) {
      console.log(`  ❌ 검출 실패 (${dt}ms)`);
      results.push({ image: img.name, detected: false, passed: false });
      continue;
    }
    const rErrPct = (Math.abs(result.r - PHASE_1_R) / PHASE_1_R) * 100;
    const passed = rErrPct < R_TOLERANCE * 100 && result.phase === 1;
    console.log(
      `  ✓ x=${result.x.toFixed(3)} y=${result.y.toFixed(3)} r=${result.r.toFixed(4)} phase=${result.phase} ` +
      `→ r 오차 ${rErrPct.toFixed(2)}% ${passed ? 'PASS' : 'FAIL'} (${dt}ms)`,
    );
    const cropOffsetX = Math.floor((meta.width - meta.height) / 2);
    const overlayPath = path.join(OUT_DIR, `service-${img.name}.png`);
    await makeServiceOverlay(srcPath, meta.width, meta.height, cropOffsetX, result, overlayPath);
    results.push({
      image: img.name,
      detected: true,
      x: result.x, y: result.y, r: result.r, phase: result.phase,
      rErrPct, passed, overlayPath,
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'service-summary.json'), JSON.stringify(results, null, 2));
  console.log('\n=== Service 검증 결과 ===');
  for (const r of results) {
    console.log(`  ${r.image}: ${r.passed ? '✓ PASS' : '✗ FAIL'} ${r.detected ? `r=${r.r?.toFixed(4)} err=${r.rErrPct?.toFixed(1)}%` : '미검출'}`);
  }
  const allPassed = results.every((r) => r.passed);
  console.log(`\n전체: ${allPassed ? '★ 모두 통과 ★' : '⚠ 일부 실패'}`);
  process.exit(allPassed ? 0 : 1);
}

main().catch((e) => {
  console.error('실패:', e);
  process.exit(2);
});
