// 자기장 원 추출 서비스 유닛 테스트
import { describe, it, expect, beforeEach } from 'vitest';
import sharp from 'sharp';
import { CircleService } from '../capture/circle.service';

function makeImageWithCircle(
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
  thickness = 4,
): Promise<string> {
  const pixels = Buffer.alloc(width * height * 3);
  // 배경: 어두운 색
  pixels.fill(30);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (Math.abs(dist - r) <= thickness) {
        const i = (y * width + x) * 3;
        pixels[i] = 240;
        pixels[i + 1] = 240;
        pixels[i + 2] = 240;
      }
    }
  }

  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer()
    .then((buf) => buf.toString('base64'));
}

function makeBlankImage(width: number, height: number): Promise<string> {
  const pixels = Buffer.alloc(width * height * 3, 30);
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg()
    .toBuffer()
    .then((buf) => buf.toString('base64'));
}

describe('CircleService', () => {
  let service: CircleService;

  beforeEach(() => {
    service = new CircleService();
  });

  it('흰색 픽셀이 없으면 null 반환', async () => {
    const base64 = await makeBlankImage(200, 200);
    expect(await service.extractCircle(base64)).toBeNull();
  });

  it('원 중심 좌표를 0~1 정규화해서 반환', async () => {
    const w = 400, h = 400;
    const cx = 200, cy = 200, r = 80;
    const base64 = await makeImageWithCircle(w, h, cx, cy, r);
    const result = await service.extractCircle(base64);

    expect(result).not.toBeNull();
    // 중심이 이미지 중앙(0.5) 근처여야 함 (±0.1 허용)
    expect(result!.x).toBeCloseTo(0.5, 0);
    expect(result!.y).toBeCloseTo(0.5, 0);
    // 반경이 0~1 범위 내
    expect(result!.r).toBeGreaterThan(0);
    expect(result!.r).toBeLessThan(1);
  });

  it('원이 오프셋된 경우 좌표 반환', async () => {
    const w = 400, h = 400;
    // 원 중심 (100, 300), 반경 60
    const base64 = await makeImageWithCircle(w, h, 100, 300, 60);
    const result = await service.extractCircle(base64);

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(100 / w, 0);
    expect(result!.y).toBeCloseTo(300 / h, 0);
  });

  it('흰색 픽셀이 일직선(수평)이면 null 반환 (원 피팅 불가)', async () => {
    // 수평선 위의 점들은 det≈0 → fitCircle이 null 반환
    const w = 400, h = 400;
    const pixels = Buffer.alloc(w * h * 3, 30);
    // y=100 행 전체를 흰색으로
    for (let x = 0; x < w; x++) {
      const i = (100 * w + x) * 3;
      pixels[i] = 240;
      pixels[i + 1] = 240;
      pixels[i + 2] = 240;
    }
    const base64 = await sharp(pixels, { raw: { width: w, height: h, channels: 3 } })
      .jpeg()
      .toBuffer()
      .then((buf) => buf.toString('base64'));

    expect(await service.extractCircle(base64)).toBeNull();
  });
});
