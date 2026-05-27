// zone-geometry 자기장 기하 헬퍼 테스트 — parentCircle(이전 페이즈) 포함 제약 검증
import { describe, it, expect } from 'vitest';
import { isZoneInsideParent } from '../capture/zone-geometry';

describe('isZoneInsideParent (줌 자기장 — 부모 존 포함 제약)', () => {
  const parent = { x: 0.5, y: 0.5, r: 0.3 };

  it('parent가 없으면 제약 없음 → 항상 true', () => {
    expect(isZoneInsideParent(0.9, 0.9, 0.2, undefined)).toBe(true);
  });

  it('부모 중심 근처의 작은 원은 내부 → true', () => {
    expect(isZoneInsideParent(0.5, 0.5, 0.15, parent)).toBe(true);
  });

  it('동심으로 부모에 꼭 맞는 원(d=0)도 → true', () => {
    expect(isZoneInsideParent(0.5, 0.5, 0.3, parent)).toBe(true);
  });

  it('부모 반경 밖으로 벗어난 중심 → false (허위 호모그래피 기각)', () => {
    // 임계 = 부모r - r + 부모r*0.2 = 0.3 - 0.1 + 0.06 = 0.26. d=0.4 > 0.26
    expect(isZoneInsideParent(0.9, 0.5, 0.1, parent)).toBe(false);
  });

  it('새 반경이 부모보다 큰 비정상 원 → false', () => {
    // 임계 = 0.3 - 0.5 + 0.06 = -0.14 < 0
    expect(isZoneInsideParent(0.5, 0.5, 0.5, parent)).toBe(false);
  });

  it('tol 여유 안의 살짝 벗어남 → true', () => {
    // d=0.24 ≤ 임계 0.26
    expect(isZoneInsideParent(0.74, 0.5, 0.1, parent)).toBe(true);
  });

  it('tol을 넘는 벗어남 → false', () => {
    // d=0.32 > 임계 0.26
    expect(isZoneInsideParent(0.82, 0.5, 0.1, parent)).toBe(false);
  });
});

describe('isZoneInsideParent — 후반 페이즈 비례 tol (절대 tol 버그 회귀 방지)', () => {
  // phase5 부모 r=0.02036, phase6 자식 r=0.01018. 기하 한계(중심거리)=0.01018.
  const lateParent = { x: 0.5, y: 0.5, r: 0.02036 };

  it('절대 tol(0.05)이면 통과하던 부모 밖 중심을 비례 tol은 기각 → false', () => {
    // d=0.05 (옛 임계 0.06018이면 통과). 비례 임계 = 0.01018 + 0.02036*0.2 ≈ 0.0143
    expect(isZoneInsideParent(0.55, 0.5, 0.01018, lateParent)).toBe(false);
  });

  it('부모 안의 정상 자식은 여전히 통과 → true', () => {
    // d=0.008 ≤ 임계 ≈0.0143
    expect(isZoneInsideParent(0.508, 0.5, 0.01018, lateParent)).toBe(true);
  });
});
