// 전체맵 자기장 검출(CircleService)을 실제 스크린샷에 돌려 오버레이로 시각 검증하는 평가 하네스
// 실행: cd apps/services/capture && TS_NODE_TRANSPILE_ONLY=1 npx ts-node -r tsconfig-paths/register scripts/fullmap-eval.ts
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { CircleService } from '../src/capture/circle.service';

// 테스트 이미지 루트 (.claude/images). 모노레포 루트 기준 상대.
const IMAGES_DIR = path.resolve(__dirname, '../../../../.claude/images');
const OUT_DIR = path.resolve(__dirname, '../../../../scripts-output/fullmap-eval');
const REPORT = path.resolve(
  __dirname,
  '../../../../docs/resources/mockups/2026-06-01-전체맵-검출-테스트/index.html',
);

// 페이즈별 오버레이 색.
const PHASE_COLOR = ['#ff3b3b', '#ff9f1c', '#ffe600', '#7CFC00', '#00e5ff', '#5b8cff', '#c14bff', '#ff4bd0'];

interface ImgSpec {
  file: string;
  group: '개인플레이';
  note: string;
}

// 전체맵 테스트 셋 — 인게임 화면공유(개인플레이 Tab 맵, 화면 중앙 정사각형)만.
// e스포츠 broadcast는 제품 타겟 아님 → 제외.
const IMAGES: ImgSpec[] = [
  { file: '1페.png', group: '개인플레이', note: '에란겔 P1 흰원+노란마커' },
  { file: '2페.png', group: '개인플레이', note: '에란겔 P2 블루존 형성' },
  { file: '초기.png', group: '개인플레이', note: '초기 화면' },
  { file: '1페짤림.png', group: '개인플레이', note: 'P1 원이 화면 밖 일부 잘림' },
  { file: '1페짤림1.png', group: '개인플레이', note: 'P1 잘림 변형' },
  { file: '1페짤림2.png', group: '개인플레이', note: 'P1 잘림 변형' },
  { file: '1페짤림3.png', group: '개인플레이', note: 'P1 잘림 변형' },
];

interface Detection {
  phase: number;
  x: number;
  y: number;
  r: number;
}

/** 한 이미지에서 페이즈 1~8을 각각 hintPhase로 넣어 통과하는 검출을 모두 수집. */
async function sweepDetections(svc: CircleService, base64: string): Promise<Detection[]> {
  const out: Detection[] = [];
  for (let phase = 1; phase <= 8; phase++) {
    const c = await svc.extractCircle(base64, phase);
    if (c) out.push({ phase: c.phase, x: c.x, y: c.y, r: c.r });
  }
  return out;
}

/** cropMapArea와 동일한 중앙 정사각형 추출 + 검출 원 오버레이 PNG(base64). */
async function makeOverlay(buffer: Buffer, dets: Detection[]): Promise<string> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const size = h;
  const offsetX = Math.floor((w - size) / 2);
  const cropBuf = await sharp(buffer)
    .extract({ left: offsetX, top: 0, width: size, height: size })
    .png()
    .toBuffer();

  const circles = dets
    .map((d) => {
      const cx = (d.x * size).toFixed(1);
      const cy = (d.y * size).toFixed(1);
      const r = (d.r * size).toFixed(1);
      const col = PHASE_COLOR[d.phase - 1];
      return (
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="3"/>` +
        `<circle cx="${cx}" cy="${cy}" r="4" fill="${col}"/>` +
        `<text x="${cx}" y="${cy}" fill="${col}" font-size="20" font-family="monospace">P${d.phase}</text>`
      );
    })
    .join('');
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${circles}</svg>`;
  const overlay = await sharp(cropBuf)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
  return overlay.toString('base64');
}

async function main(): Promise<void> {
  const svc = new CircleService();
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(REPORT), { recursive: true });

  const rows: string[] = [];
  for (const spec of IMAGES) {
    const fp = path.join(IMAGES_DIR, spec.file);
    let buffer: Buffer;
    try {
      buffer = await fs.readFile(fp);
    } catch {
      rows.push(renderRow(spec, [], '', '파일 없음'));
      continue;
    }
    const base64 = buffer.toString('base64');
    const dets = await sweepDetections(svc, base64);
    const overlayB64 = await makeOverlay(buffer, dets);
    await fs.writeFile(path.join(OUT_DIR, spec.file.replace(/\s+/g, '_') + '.overlay.png'), Buffer.from(overlayB64, 'base64'));
    const verdict = dets.length === 0 ? '검출 0 (MISS)' : `검출 ${dets.length}개: ${dets.map((d) => `P${d.phase}`).join(',')}`;
    rows.push(renderRow(spec, dets, overlayB64, verdict));
    // 콘솔 요약.
    // eslint-disable-next-line no-console
    console.log(`${spec.file}: ${verdict}`);
  }

  const html = renderHtml(rows.join('\n'));
  await fs.writeFile(REPORT, html, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`\n리포트: ${REPORT}`);
}

function renderRow(spec: ImgSpec, dets: Detection[], overlayB64: string, verdict: string): string {
  const detTable = dets
    .map((d) => `<tr><td style="color:${PHASE_COLOR[d.phase - 1]}">P${d.phase}</td><td>${d.x.toFixed(3)}</td><td>${d.y.toFixed(3)}</td><td>${d.r.toFixed(4)}</td></tr>`)
    .join('');
  const img = overlayB64
    ? `<img src="data:image/png;base64,${overlayB64}" style="max-width:380px;border:1px solid #333"/>`
    : '<div style="color:#f55">이미지 없음</div>';
  const ok = dets.length > 0;
  return `
  <div class="card">
    <div class="hdr"><span class="badge ${spec.group === 'broadcast' ? 'b' : 'p'}">${spec.group}</span>
      <b>${spec.file}</b> — ${spec.note}
      <span class="verdict ${ok ? 'ok' : 'miss'}">${verdict}</span></div>
    <div class="body">${img}
      <table><thead><tr><th>페이즈</th><th>x</th><th>y</th><th>r(정규화)</th></tr></thead><tbody>${detTable || '<tr><td colspan=4>검출 없음</td></tr>'}</tbody></table>
    </div>
  </div>`;
}

function renderHtml(body: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>전체맵 자기장 검출 테스트 — 2026-06-01</title>
<style>
 body{background:#0d1117;color:#e6edf3;font-family:system-ui,'Malgun Gothic';margin:0;padding:24px}
 h1{font-size:20px} .sub{color:#8b949e;margin-bottom:20px}
 .card{background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:16px;padding:12px}
 .hdr{margin-bottom:8px} .body{display:flex;gap:16px;align-items:flex-start}
 .badge{font-size:11px;padding:2px 8px;border-radius:10px;margin-right:6px}
 .badge.p{background:#1f6feb} .badge.b{background:#8957e5}
 .verdict{float:right;font-weight:600} .verdict.ok{color:#3fb950} .verdict.miss{color:#f85149}
 table{border-collapse:collapse;font-size:13px} th,td{border:1px solid #30363d;padding:3px 8px;text-align:center}
</style></head><body>
<h1>전체맵 자기장 검출 테스트 (production CircleService)</h1>
<div class="sub">각 이미지에 페이즈 1~8을 hintPhase로 넣어 통과한 검출을 색으로 오버레이. 중앙 정사각형(cropMapArea) 기준. 사용자 시각 판정용.</div>
${body}
</body></html>`;
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
