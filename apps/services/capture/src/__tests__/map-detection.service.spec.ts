// 전체맵 열림 감지 서비스 유닛 테스트
import { describe, it, expect, beforeEach } from 'vitest';
import sharp from 'sharp';
import { MapDetectionService } from '../capture/map-detection.service';

function makeImage(
  width: number,
  height: number,
  fillFn: (x: number, y: number) => [number, number, number],
): Promise<string> {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const [r, g, b] = fillFn(x, y);
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer()
    .then((buf) => buf.toString('base64'));
}

describe('MapDetectionService', () => {
  let service: MapDetectionService;

  beforeEach(() => {
    service = new MapDetectionService();
  });

  it('전체 파란색 이미지 → true', async () => {
    const base64 = await makeImage(100, 100, () => [0, 0, 200]);
    expect(await service.isMapOpen(base64)).toBe(true);
  });

  it('전체 녹색 이미지 → false', async () => {
    const base64 = await makeImage(100, 100, () => [0, 200, 0]);
    expect(await service.isMapOpen(base64)).toBe(false);
  });

  it('전체 빨간색 이미지 → false', async () => {
    const base64 = await makeImage(100, 100, () => [200, 0, 0]);
    expect(await service.isMapOpen(base64)).toBe(false);
  });

  it('이미지 50% 폭 청록 영역(맵 모양) → true', async () => {
    // 중앙 50%×50% 청록(=25% 픽셀) — bbox 폭 50% > 40% 임계 + 종횡비 1.0 → 맵 인식.
    const w = 100, h = 100;
    const l = Math.floor((w - Math.floor(w * 0.5)) / 2);
    const r = l + Math.floor(w * 0.5);
    const t = Math.floor((h - Math.floor(h * 0.5)) / 2);
    const b = t + Math.floor(h * 0.5);
    const base64 = await makeImage(w, h, (x, y) =>
      x >= l && x < r && y >= t && y < b ? [0, 0, 200] : [200, 100, 50],
    );
    expect(await service.isMapOpen(base64)).toBe(true);
  });

  it('작은 청록 영역(30% 폭) → 중앙 정사각형 폴백 반환 (작은 자기장 페이즈 보존)', async () => {
    // 작은 자기장 페이즈(4+)에 내륙 위주 맵: 청록 3~10%로 낮고 bbox 부적합.
    // 검출 자체는 보존(중앙 정사각형), 가짜 false positive는 프론트 freshStreak 가드가 차단.
    const w = 100, h = 100;
    const l = Math.floor((w - Math.floor(w * 0.3)) / 2);
    const r = l + Math.floor(w * 0.3);
    const t = Math.floor((h - Math.floor(h * 0.3)) / 2);
    const b = t + Math.floor(h * 0.3);
    const base64 = await makeImage(w, h, (x, y) =>
      x >= l && x < r && y >= t && y < b ? [0, 0, 200] : [200, 100, 50],
    );
    expect(await service.isMapOpen(base64)).toBe(true);
  });

  it('PUBG 바다색(어두운 청록) 픽셀만 → true', async () => {
    // R:40, G:55, B:80 — 에란겔 바다 특유의 어두운 청록
    const base64 = await makeImage(100, 100, () => [40, 55, 80]);
    expect(await service.isMapOpen(base64)).toBe(true);
  });

  it('밝은 하늘색(R,G 높음)은 바다색과 구분 → false', async () => {
    // R:130, G:160, B:190 — 게임 하늘색은 R/G가 115 초과라 제외됨
    const base64 = await makeImage(100, 100, () => [130, 160, 190]);
    expect(await service.isMapOpen(base64)).toBe(false);
  });
});

describe('MapDetectionService - 청록 ≥30% 정상 맵 회귀', () => {
  let svc: MapDetectionService;
  beforeEach(() => { svc = new MapDetectionService(); });

  it('청록 50%+ + bbox 종횡비 화면비(1.78) → 맵 영역 반환 (false negative 방지)', async () => {
    // 1920×1080 화면 가득 청록(=화면비 1.78). 종횡비 검사 fail해도 청록 ≥30%라 통과해야 함.
    const w = 192, h = 108; // 16:9 축약본 (1920×1080의 1/10), bbox aspect 1.78
    const base64 = await makeImage(w, h, () => [0, 0, 200]);
    const area = await svc.detectMapArea(base64);
    expect(area).not.toBeNull();
    expect(area!.width).toBe(area!.height); // 정사각형 반환
  });
});
