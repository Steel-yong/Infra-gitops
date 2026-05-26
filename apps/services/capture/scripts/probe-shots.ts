// 사용자가 올린 실제 스크린샷에 hintPhase를 주고 자기장 추출 파이프라인을 돌려 검출 여부를 확인하는 프로브
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { CircleService } from '../src/capture/circle.service';
import { MapDetectionService } from '../src/capture/map-detection.service';
import { SiftZoneService } from '../src/capture/sift-zone.service';
import { CaptureService } from '../src/capture/capture.service';

const IMAGE_DIR = '/mnt/d/infra project/Infra-gitops/.claude/images';
const OUT_DIR = '/mnt/d/infra project/Infra-gitops/.local/pub39-shots';

const SHOTS = [
  { name: '1페 전체맵', file: '1페.png', phase: 1 },
  { name: '2페 전체맵', file: '2페.png', phase: 2 },
  { name: '1페 확대', file: '1페확대.png', phase: 1 },
  { name: '1페 짤림1', file: '1페짤림1.png', phase: 1 },
  { name: '2페 확대', file: '2페확대.png', phase: 2 },
] as const;

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mapDetection = new MapDetectionService();
  const circleService = new CircleService();
  const siftZone = new SiftZoneService();
  const capture = new CaptureService(mapDetection, circleService, siftZone);

  const results: Array<Record<string, unknown>> = [];
  for (const s of SHOTS) {
    const src = path.join(IMAGE_DIR, s.file);
    if (!fs.existsSync(src)) {
      console.log(`[${s.name}] 파일 없음: ${s.file}`);
      results.push({ name: s.name, ok: false, reason: 'no-file' });
      continue;
    }
    const buf = await fs.promises.readFile(src);
    const meta = await sharp(buf).metadata();
    const b64 = buf.toString('base64');
    const mapArea = await mapDetection.detectMapArea(b64);
    const t0 = Date.now();
    const circle = await capture.processFrame(b64, s.phase);
    const dt = Date.now() - t0;
    const path_used = mapArea ? '전체맵' : 'SIFT-zone(줌)';
    if (circle) {
      console.log(`[${s.name}] ✓ 검출 (${path_used}, ${dt}ms) → x=${circle.x.toFixed(3)} y=${circle.y.toFixed(3)} r=${circle.r.toFixed(4)} phase=${circle.phase}`);
      results.push({ name: s.name, ok: true, path: path_used, ...circle, ms: dt, imgW: meta.width, imgH: meta.height });
    } else {
      console.log(`[${s.name}] ✗ 미검출 (${path_used}, ${dt}ms)`);
      results.push({ name: s.name, ok: false, path: path_used, ms: dt });
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'probe-result.json'), JSON.stringify(results, null, 2));
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== 결과: ${ok}/${results.length} 검출 ===`);
}

main().catch((e) => { console.error('실패:', e); process.exit(2); });
