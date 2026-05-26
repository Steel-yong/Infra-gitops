// endScreenClassifier 테스트 — 치킨(노랑)/죽음(어두움)/일반(컬러) 구분
import { describe, it, expect } from 'vitest';
import { classifyEndFrame } from '../hooks/endScreenClassifier';

/** w*h 픽셀을 단색 RGBA로 채운 배열 생성. */
function fill(r: number, g: number, b: number, count = 1000): Uint8ClampedArray {
  const px = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = 255;
  }
  return px;
}

describe('classifyEndFrame', () => {
  it('대부분 노란색이면 chicken', () => {
    expect(classifyEndFrame(fill(255, 220, 40))).toBe('chicken');
  });

  it('대부분 어두우면 death', () => {
    expect(classifyEndFrame(fill(15, 15, 15))).toBe('death');
  });

  it('일반 컬러 화면(초록맵)이면 null', () => {
    expect(classifyEndFrame(fill(60, 120, 80))).toBe(null);
  });

  it('파란 바다 같은 밝은 컬러도 null', () => {
    expect(classifyEndFrame(fill(40, 90, 130))).toBe(null);
  });

  it('빈 배열이면 null', () => {
    expect(classifyEndFrame(new Uint8ClampedArray(0))).toBe(null);
  });

  it('노랑이 어두움보다 우선 (치킨 화면에 어두운 배경 섞여도 chicken)', () => {
    // 30% 노랑 + 70% 어두움 → 노랑비율 0.3 ≥ 0.06 → chicken
    const px = new Uint8ClampedArray(1000 * 4);
    for (let i = 0; i < 1000; i++) {
      const yellow = i < 300;
      px[i * 4] = yellow ? 255 : 10;
      px[i * 4 + 1] = yellow ? 210 : 10;
      px[i * 4 + 2] = yellow ? 40 : 10;
      px[i * 4 + 3] = 255;
    }
    expect(classifyEndFrame(px)).toBe('chicken');
  });
});
