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

  it('중앙 30% 영역이 파란색이면 → true', async () => {
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

  it('b > 150 이지만 r, g 조건 미달 → false', async () => {
    // b=160 이지만 r=120이라 b <= r*1.5(=180) → false
    const base64 = await makeImage(100, 100, () => [120, 120, 160]);
    expect(await service.isMapOpen(base64)).toBe(false);
  });
});
