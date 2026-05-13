// 캡처 프레임에서 자기장 원의 중심과 반경을 추출하는 서비스
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type { CircleData } from '@pubg-helper/shared';

@Injectable()
export class CircleService {
  async extractCircle(base64: string): Promise<CircleData | null> {
    const buffer = Buffer.from(base64, 'base64');
    const { data, info } = await sharp(buffer)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const points: [number, number][] = [];

    // 4픽셀 간격 샘플링으로 흰색 픽셀(자기장 원 테두리) 수집
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 3;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) {
          points.push([x, y]);
        }
      }
    }

    if (points.length < 10) return null;

    const circle = fitCircle(points);
    if (!circle) return null;

    // 합리적인 반경 범위 체크: 이미지 너비의 5~90%
    if (circle.r < width * 0.05 || circle.r > Math.max(width, height) * 0.9) return null;

    // 피팅 품질 검증: 평균 잔차가 반경의 25% 초과면 점들이 원을 이루지 않는다고 판단
    const avgResidual =
      points.reduce((sum, [x, y]) => {
        const dist = Math.sqrt((x - circle.cx) ** 2 + (y - circle.cy) ** 2);
        return sum + Math.abs(dist - circle.r);
      }, 0) / points.length;
    if (avgResidual > circle.r * 0.25) return null;

    return {
      x: circle.cx / width,
      y: circle.cy / height,
      r: circle.r / Math.min(width, height),
    };
  }
}

/**
 * Kasa 대수적 최소제곱법으로 점 집합에 원을 피팅
 */
function fitCircle(
  points: [number, number][],
): { cx: number; cy: number; r: number } | null {
  const n = points.length;
  const mx = points.reduce((s, [x]) => s + x, 0) / n;
  const my = points.reduce((s, [, y]) => s + y, 0) / n;

  let Suu = 0, Svv = 0, Suv = 0;
  let Suuu = 0, Svvv = 0, Suuv = 0, Suvv = 0;

  for (const [x, y] of points) {
    const u = x - mx;
    const v = y - my;
    Suu += u * u;
    Svv += v * v;
    Suv += u * v;
    Suuu += u * u * u;
    Svvv += v * v * v;
    Suuv += u * u * v;
    Suvv += u * v * v;
  }

  const b1 = (Suuu + Suvv) / 2;
  const b2 = (Suuv + Svvv) / 2;
  const det = Suu * Svv - Suv * Suv;
  if (Math.abs(det) < 1e-10) return null;

  const uc = (b1 * Svv - b2 * Suv) / det;
  const vc = (b2 * Suu - b1 * Suv) / det;

  return {
    cx: uc + mx,
    cy: vc + my,
    r: Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / n),
  };
}
