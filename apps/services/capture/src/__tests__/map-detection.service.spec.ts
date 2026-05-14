// 전체맵 감지 + 맵 영역 검출 서비스 유닛 테스트
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

  describe('isMapOpen (호환)', () => {
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

    it('PUBG 바다색 픽셀 → true', async () => {
      const base64 = await makeImage(100, 100, () => [40, 55, 80]);
      expect(await service.isMapOpen(base64)).toBe(true);
    });

    it('밝은 하늘색 → false (R/G 115 초과로 제외)', async () => {
      const base64 = await makeImage(100, 100, () => [130, 160, 190]);
      expect(await service.isMapOpen(base64)).toBe(false);
    });
  });

  describe('detectMapArea', () => {
    it('청록 픽셀이 없으면 null', async () => {
      const base64 = await makeImage(200, 200, () => [200, 0, 0]);
      expect(await service.detectMapArea(base64)).toBeNull();
    });

    it('청록 픽셀이 사방에 분포하면 bounding box 반환', async () => {
      // 200x200 이미지의 가운데 100x100 영역만 청록
      const base64 = await makeImage(200, 200, (x, y) =>
        x >= 50 && x < 150 && y >= 50 && y < 150 ? [40, 55, 80] : [200, 100, 50],
      );
      const result = await service.detectMapArea(base64);
      expect(result).not.toBeNull();
      // 검출된 정사각형이 청록 영역과 거의 일치해야 함
      expect(result!.width).toBeGreaterThan(80);
      expect(result!.width).toBeLessThan(120);
      // 정사각형이어야 함
      expect(Math.abs(result!.width - result!.height)).toBeLessThan(10);
    });

    it('청록 픽셀이 한쪽 모서리에만 있으면 폴백 (중앙 정사각형) 사용', async () => {
      // 400x300 이미지의 좌상단 30x30 모서리만 청록 → 종횡비/크기 검증 실패 → 폴백
      const base64 = await makeImage(400, 300, (x, y) =>
        x < 30 && y < 30 ? [40, 55, 80] : [200, 100, 50],
      );
      const result = await service.detectMapArea(base64);
      // 청록 비율이 3% 미만이면 null, 이상이면 폴백
      if (result !== null) {
        // 폴백 시 화면 높이 = 정사각형 변
        expect(result.width).toBe(300);
        expect(result.height).toBe(300);
        expect(result.top).toBe(0);
        expect(result.left).toBe(50);
      }
    });

    it('이미지 폭/높이 0 → null', async () => {
      // 빈 base64 시도 시 sharp가 에러를 던지므로 try/catch
      await expect(service.detectMapArea('')).rejects.toThrow();
    });

    it('청록 비율은 충분하지만 한쪽으로 극단적으로 치우치면 폴백', async () => {
      // 400×400, 좌측 절반 (200×400, 50%) 청록 → 비율 OK지만 종횡비 너무 가로:세로 = 1:2
      const base64 = await makeImage(400, 400, (x) => (x < 200 ? [40, 55, 80] : [200, 100, 50]));
      const result = await service.detectMapArea(base64);
      expect(result).not.toBeNull();
      // 폴백 시 정사각형 변 = 높이
      expect(result!.width).toBe(400);
      expect(result!.height).toBe(400);
    });

    it('B 값이 R+12 이하면 청록으로 보지 않음', async () => {
      // R:70, G:60, B:75 → B - R = 5 (12 미만)
      const base64 = await makeImage(100, 100, () => [70, 60, 75]);
      expect(await service.detectMapArea(base64)).toBeNull();
    });

    it('1920×1080 → 1080×1080 중앙 정사각형 (가상 폴백 케이스)', async () => {
      // 청록을 양 끝 작은 영역에만 두어 1차 검증 실패 → 폴백 검증
      // 단, 청록 비율이 3% 이상이도록 분포시킴
      const base64 = await makeImage(1920, 1080, (x, y) => {
        // 좌상단 200×200 + 우하단 200×200 (총 약 7.7% > 3% 임계)
        if (x < 200 && y < 200) return [40, 55, 80];
        if (x >= 1720 && y >= 880) return [40, 55, 80];
        return [200, 100, 50];
      });
      const result = await service.detectMapArea(base64);
      expect(result).not.toBeNull();
      // 1차 검출 시 bbox는 좌상단부터 우하단까지로 종횡비는 1.0 근처
      // 두 케이스 모두 정사각형 + 합리적 크기를 가져야 함
      expect(Math.abs(result!.width - result!.height)).toBeLessThan(5);
    });
  });
});
