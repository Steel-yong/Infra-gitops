// zoom-localize 테스트 — 앵커 원 + 검출 링으로 픽셀↔게임 변환 (A안 순수 기하)
import { describe, it, expect } from 'vitest';
import {
  deriveZoomTransform,
  pixelToGame,
  localizeNextZone,
  type Anchor,
  type PixelCircle,
} from '../capture/zoom-localize';

const anchor: Anchor = { x: 0.5, y: 0.5, r: 0.1 };
const currentRing: PixelCircle = { px: 1000, py: 500, pr: 300 }; // scale = 300/0.1 = 3000

describe('deriveZoomTransform', () => {
  it('scale = 검출 픽셀반경 / 앵커 정규화반경', () => {
    const t = deriveZoomTransform(anchor, currentRing);
    expect(t).not.toBeNull();
    expect(t?.scale).toBe(3000);
    expect(t?.px0).toBe(1000);
    expect(t?.gx0).toBe(0.5);
  });

  it('앵커 반경 0이면 null', () => {
    expect(deriveZoomTransform({ x: 0.5, y: 0.5, r: 0 }, currentRing)).toBeNull();
  });

  it('검출 반경 0이면 null', () => {
    expect(deriveZoomTransform(anchor, { px: 1, py: 1, pr: 0 })).toBeNull();
  });
});

describe('pixelToGame', () => {
  const t = deriveZoomTransform(anchor, currentRing)!;

  it('링 중심 픽셀 → 앵커 중심 게임좌표', () => {
    expect(pixelToGame(t, 1000, 500)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('오른쪽 +300px → 게임 +0.1 (scale 3000)', () => {
    expect(pixelToGame(t, 1300, 500)).toEqual({ x: 0.6, y: 0.5 });
  });

  it('위쪽 -300px → 게임 y -0.1 (이미지 좌표계 위 0)', () => {
    expect(pixelToGame(t, 1000, 200)).toEqual({ x: 0.5, y: 0.4 });
  });
});

describe('localizeNextZone', () => {
  it('다음 원 픽셀 → 절대 중심 + 다음 페이즈 반경', () => {
    const nextRing: PixelCircle = { px: 1150, py: 500, pr: 150 };
    const next = localizeNextZone(anchor, currentRing, nextRing, 0.05);
    expect(next).toEqual({ x: 0.55, y: 0.5, r: 0.05 });
  });

  it('변환 불가(앵커 반경 0)면 null', () => {
    const bad: Anchor = { x: 0.5, y: 0.5, r: 0 };
    expect(localizeNextZone(bad, currentRing, { px: 1, py: 1, pr: 1 }, 0.05)).toBeNull();
  });
});
