// zoom-detect 테스트 — 흰 원 RANSAC 검출 (합성 원으로 정확도 검증)
import { describe, it, expect } from 'vitest';
import { circleFromThree, fitRing, type PixelPoint } from '../capture/zoom-detect';

describe('circleFromThree', () => {
  it('원 위 세 점으로 중심·반경 복원', () => {
    const c = circleFromThree([700, 400], [300, 400], [500, 200]); // center(500,400) r200
    expect(c).not.toBeNull();
    expect(Math.round(c!.cx)).toBe(500);
    expect(Math.round(c!.cy)).toBe(400);
    expect(Math.round(c!.r)).toBe(200);
  });

  it('공선 점은 null', () => {
    expect(circleFromThree([0, 0], [1, 1], [2, 2])).toBeNull();
  });
});

describe('fitRing (RANSAC)', () => {
  it('노이즈+이상치 섞인 원 점들에서 원 복원', () => {
    const cx = 500;
    const cy = 400;
    const r = 200;
    const pts: PixelPoint[] = [];
    for (let i = 0; i < 200; i++) {
      const a = Math.random() * Math.PI * 2;
      pts.push([cx + r * Math.cos(a) + (Math.random() - 0.5) * 2, cy + r * Math.sin(a) + (Math.random() - 0.5) * 2]);
    }
    for (let i = 0; i < 80; i++) pts.push([Math.random() * 1000, Math.random() * 800]); // 이상치

    const fit = fitRing(pts, { rMin: 50, rMax: 400 });
    expect(fit).not.toBeNull();
    expect(Math.abs(fit!.px - cx)).toBeLessThan(8);
    expect(Math.abs(fit!.py - cy)).toBeLessThan(8);
    expect(Math.abs(fit!.pr - r)).toBeLessThan(8);
    expect(fit!.inliers).toBeGreaterThan(150);
  });

  it('점 부족이면 null', () => {
    expect(fitRing([[1, 1], [2, 2]])).toBeNull();
  });
});
