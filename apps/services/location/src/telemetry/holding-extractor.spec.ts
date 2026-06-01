// holding-extractor 순수 함수 유닛 테스트 — 정지/이동/차량/존밖/공중/P6+ 분류 검증
import { describe, it, expect } from 'vitest';
import {
  extractHoldings,
  phaseAt,
  phaseFromRadius,
  type LandingEvent,
  type PlayerSample,
  type ZoneSnapshot,
} from './holding-extractor';

const SIDE = 816000;
const T = 1000; // 정지 임계 10m

/** 표본 생성 헬퍼. 기본은 자기장 안·비차량. */
function sample(name: string, t: number, x: number, y: number, over: Partial<PlayerSample> = {}): PlayerSample {
  return { name, teamId: 1, t, x, y, inVehicle: false, inBlueZone: false, ...over };
}

/** P1 자기장(반경 0.713). */
const ZONES_P1: ZoneSnapshot[] = [{ t: 0, radiusNorm: 0.713 }];
const NO_LANDING: LandingEvent[] = [];
const OPTS = { side: SIDE, thresholdCm: T };

/** 한 자리에 머문 3샘플. */
function stoppedRun(name = 'pro', x = 408000, y = 408000): PlayerSample[] {
  return [sample(name, 100, x, y), sample(name, 110, x + 50, y - 50), sample(name, 120, x, y + 30)];
}

describe('phaseFromRadius', () => {
  it('큰 반경은 초반 페이즈, 작은 반경은 후반 페이즈', () => {
    expect(phaseFromRadius(0.713)).toBe(1);
    expect(phaseFromRadius(0.12)).toBe(2);
    expect(phaseFromRadius(0.05)).toBe(4);
    expect(phaseFromRadius(0.015)).toBe(7);
    expect(phaseFromRadius(0.001)).toBe(9);
  });
});

describe('phaseAt', () => {
  it('조회 시각 이하 마지막 스냅샷의 페이즈', () => {
    const zones: ZoneSnapshot[] = [
      { t: 0, radiusNorm: 0.713 },
      { t: 300, radiusNorm: 0.1 },
      { t: 600, radiusNorm: 0.04 },
    ];
    expect(phaseAt(zones, 50)).toBe(1);
    expect(phaseAt(zones, 350)).toBe(2);
    expect(phaseAt(zones, 700)).toBe(4);
  });

  it('첫 스냅샷 이전이면 콜드 스타트 P1', () => {
    expect(phaseAt([{ t: 500, radiusNorm: 0.1 }], 10)).toBe(1);
  });
});

describe('extractHoldings', () => {
  it('자기장 안에서 3샘플 정지하면 명당 1개 (좌표 정규화·페이즈·지속)', () => {
    const holds = extractHoldings(stoppedRun(), ZONES_P1, NO_LANDING, OPTS);
    expect(holds).toHaveLength(1);
    const h = holds[0];
    expect(h.phase).toBe(1);
    expect(h.sampleCount).toBe(3);
    expect(h.durSec).toBe(20);
    // 좌표는 0~1 정규화, 중심 ≈ 408000/816000 = 0.5
    expect(h.x).toBeGreaterThan(0);
    expect(h.x).toBeLessThanOrEqual(1);
    expect(h.y).toBeGreaterThanOrEqual(0);
    expect(h.y).toBeLessThanOrEqual(1);
    expect(h.x).toBeCloseTo(0.5, 2);
    expect(h.y).toBeCloseTo(0.5, 2);
  });

  it('계속 이동(임계 초과)하면 명당 없음', () => {
    const moving = [
      sample('pro', 100, 0, 0),
      sample('pro', 110, 408000, 0),
      sample('pro', 120, 816000, 0),
    ];
    expect(extractHoldings(moving, ZONES_P1, NO_LANDING, OPTS)).toHaveLength(0);
  });

  it('차량 탑승 표본은 제외', () => {
    const inCar = stoppedRun().map((s) => ({ ...s, inVehicle: true }));
    expect(extractHoldings(inCar, ZONES_P1, NO_LANDING, OPTS)).toHaveLength(0);
  });

  it('자기장 밖 표본은 제외', () => {
    const outside = stoppedRun().map((s) => ({ ...s, inBlueZone: true }));
    expect(extractHoldings(outside, ZONES_P1, NO_LANDING, OPTS)).toHaveLength(0);
  });

  it('착지 전(공중) 표본은 제외', () => {
    const landings: LandingEvent[] = [{ name: 'pro', t: 200 }];
    expect(extractHoldings(stoppedRun(), ZONES_P1, landings, OPTS)).toHaveLength(0);
  });

  it('P6+ (후반 극소 자기장) 정지는 제외', () => {
    const zonesP7: ZoneSnapshot[] = [{ t: 0, radiusNorm: 0.015 }];
    expect(extractHoldings(stoppedRun(), zonesP7, NO_LANDING, OPTS)).toHaveLength(0);
  });

  it('두 선수가 각각 정지하면 명당 2개', () => {
    const two = [...stoppedRun('a', 300000, 300000), ...stoppedRun('b', 500000, 500000)];
    const holds = extractHoldings(two, ZONES_P1, NO_LANDING, OPTS);
    expect(holds).toHaveLength(2);
    expect(holds.map((h) => h.name).sort()).toEqual(['a', 'b']);
  });

  it('정지 표본이 2개뿐이면(런 미만) 명당 없음', () => {
    const twoSamples = [sample('pro', 100, 408000, 408000), sample('pro', 110, 408000, 408000)];
    expect(extractHoldings(twoSamples, ZONES_P1, NO_LANDING, OPTS)).toHaveLength(0);
  });
});
