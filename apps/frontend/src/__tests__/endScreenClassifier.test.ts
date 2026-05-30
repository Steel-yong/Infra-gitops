// endScreenClassifier 테스트 — 치킨(노랑)/죽음(어두움)/일반(컬러) 구분
import { describe, it, expect } from 'vitest';
import { classifyEndFrame, isResultScreenText } from '../hooks/endScreenClassifier';

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

  it('대부분 어두우면 dark (게이트 — 죽음 확정 아님, OCR 확인 필요)', () => {
    expect(classifyEndFrame(fill(15, 15, 15))).toBe('dark');
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

describe('isResultScreenText ("다음"만 종료 확정 — 사용자 지정)', () => {
  it('"다음" 텍스트만 종료화면으로 인식', () => {
    expect(isResultScreenText('다음으로')).toBe(true);
    expect(isResultScreenText('다음')).toBe(true);
  });
  it('"다음" 외 키워드(#N·순위·결과·관전)는 종료화면 아님 (어두운 화면 OCR 오판 방지)', () => {
    expect(isResultScreenText('#35  KYUGOO')).toBe(false);
    expect(isResultScreenText('35 / 99')).toBe(false);
    expect(isResultScreenText('매치 결과')).toBe(false);
    expect(isResultScreenText('관전 모드')).toBe(false);
  });
  it('일반 게임플레이 텍스트·빈 문자열은 종료화면 아님', () => {
    expect(isResultScreenText('123m  ammo')).toBe(false);
    expect(isResultScreenText('')).toBe(false);
  });
});
