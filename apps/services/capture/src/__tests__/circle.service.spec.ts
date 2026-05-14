// 자기장 원 추출 서비스 유닛 테스트 (MapArea 기반 crop + 정규화)
import { describe, it, expect, beforeEach } from 'vitest';
import sharp from 'sharp';
import { CircleService } from '../capture/circle.service';
import type { MapArea } from '../capture/map-detection.service';

function makeImageWithCircle(
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
  thickness = 4,
): Promise<string> {
  const pixels = Buffer.alloc(width * height * 3);
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

const fullArea = (w: number, h: number): MapArea => ({ left: 0, top: 0, width: w, height: h });

describe('CircleService', () => {
  let service: CircleService;

  beforeEach(() => {
    service = new CircleService();
  });

  it('흰색 픽셀이 없으면 null 반환', async () => {
    const base64 = await makeBlankImage(200, 200);
    expect(await service.extractCircle(base64, fullArea(200, 200))).toBeNull();
  });

  it('원 중심이 mapArea 기준 0.5,0.5 정규화', async () => {
    const w = 400, h = 400;
    const base64 = await makeImageWithCircle(w, h, 200, 200, 80);
    const result = await service.extractCircle(base64, fullArea(w, h));

    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0.5, 1);
    expect(result!.y).toBeCloseTo(0.5, 1);
    expect(result!.r).toBeCloseTo(80 / 400, 1);
  });

  it('mapArea가 화면 일부일 때 그 영역 기준으로 정규화', async () => {
    // 1920x1080 이미지의 중앙 1080x1080 영역만 맵으로 가정
    // 원은 맵 영역 내 (cx=960, cy=540, r=200)
    const w = 1920, h = 1080;
    const base64 = await makeImageWithCircle(w, h, 960, 540, 200);
    const mapArea: MapArea = { left: 420, top: 0, width: 1080, height: 1080 };
    const result = await service.extractCircle(base64, mapArea);

    expect(result).not.toBeNull();
    // mapArea 내 원 중심: x=(960-420)/1080=0.5, y=540/1080=0.5
    expect(result!.x).toBeCloseTo(0.5, 1);
    expect(result!.y).toBeCloseTo(0.5, 1);
    // 반경 200/1080 ≈ 0.185
    expect(result!.r).toBeCloseTo(200 / 1080, 1);
  });

  it('mapArea 바깥의 원은 검출되지 않음', async () => {
    // 원이 mapArea 바깥(왼쪽 영역)에 있고 mapArea는 우측 절반
    const w = 800, h = 400;
    const base64 = await makeImageWithCircle(w, h, 100, 200, 50);
    const mapArea: MapArea = { left: 400, top: 0, width: 400, height: 400 };

    const result = await service.extractCircle(base64, mapArea);
    // mapArea 안에 흰 픽셀이 없으므로 null
    expect(result).toBeNull();
  });

  it('반경이 mapArea 너비의 5% 미만이면 null (너무 작은 원)', async () => {
    const w = 400, h = 400;
    // r=10이면 5% 임계(20) 미만
    const base64 = await makeImageWithCircle(w, h, 200, 200, 10);
    expect(await service.extractCircle(base64, fullArea(w, h))).toBeNull();
  });

  it('반경이 mapArea 너비의 90% 초과면 null (너무 큰 원)', async () => {
    const w = 400, h = 400;
    // r=380이면 95% (>90%)
    const base64 = await makeImageWithCircle(w, h, 200, 200, 380);
    expect(await service.extractCircle(base64, fullArea(w, h))).toBeNull();
  });

  it('흰 픽셀이 흩어져 있어 원이 아닌 경우 null (잔차 초과)', async () => {
    // 흰 픽셀을 랜덤 위치에 분포 → 원 피팅은 되지만 잔차가 크게 나옴
    const w = 400, h = 400;
    const pixels = Buffer.alloc(w * h * 3, 30);
    const points = [
      [50, 50], [350, 50], [50, 350], [350, 350], [200, 30], [30, 200],
      [370, 200], [200, 370], [100, 100], [300, 300], [150, 250], [250, 150],
    ];
    for (const [px, py] of points) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const i = ((py + dy) * w + (px + dx)) * 3;
          pixels[i] = 240;
          pixels[i + 1] = 240;
          pixels[i + 2] = 240;
        }
      }
    }
    const base64 = await sharp(pixels, { raw: { width: w, height: h, channels: 3 } })
      .jpeg()
      .toBuffer()
      .then((buf) => buf.toString('base64'));

    const result = await service.extractCircle(base64, fullArea(w, h));
    // 점들이 원형 분포가 아니므로 null
    expect(result).toBeNull();
  });

  it('일직선 흰 픽셀은 null 반환 (원 피팅 불가 또는 잔차 초과)', async () => {
    const w = 400, h = 400;
    const pixels = Buffer.alloc(w * h * 3, 30);
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

    expect(await service.extractCircle(base64, fullArea(w, h))).toBeNull();
  });
});
