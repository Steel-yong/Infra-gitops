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

  it('작은 청록 구역(폭 40% 미만)은 전체맵 아님 → false (맵 안 켰는데 오검출 방지)', async () => {
    // 중앙 30% 구역만 청록 — 청록 비율은 3%↑지만 bbox 폭이 화면 40% 미만이라 전체맵 아님.
    const w = 100, h = 100;
    const l = Math.floor((w - Math.floor(w * 0.3)) / 2);
    const r = l + Math.floor(w * 0.3);
    const t = Math.floor((h - Math.floor(h * 0.3)) / 2);
    const b = t + Math.floor(h * 0.3);
    const base64 = await makeImage(w, h, (x, y) =>
      x >= l && x < r && y >= t && y < b ? [0, 0, 200] : [200, 100, 50],
    );
    expect(await service.isMapOpen(base64)).toBe(false);
  });

  it('큰 청록 구역(폭 40% 이상)은 전체맵 → true', async () => {
    // 중앙 60% 구역 청록 — bbox 폭·종횡비 검증 통과 → 전체맵으로 검출.
    const w = 100, h = 100;
    const l = Math.floor((w - Math.floor(w * 0.6)) / 2);
    const r = l + Math.floor(w * 0.6);
    const t = Math.floor((h - Math.floor(h * 0.6)) / 2);
    const b = t + Math.floor(h * 0.6);
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
