// LocationService 단위 테스트 — 자기장 원 필터링 + 거리순 정렬
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  map: { findUnique: vi.fn() },
  location: { findMany: vi.fn() },
};

const erangelMap = { id: 'map-erangel', type: 'erangel', name: '에란겔', createdAt: new Date() };

const makeLocation = (id: string, x: number, y: number) => ({
  id,
  mapId: 'map-erangel',
  coordX: x,
  coordY: y,
  tier: 'S' as const,
  proTeamNames: ['TeamA'],
  usageCount: 10,
});

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<LocationService>(LocationService);
  });

  it('서비스가 정의된다', () => {
    expect(service).toBeDefined();
  });

  it('원 내부 3개 위치를 거리순으로 반환한다', async () => {
    mockPrisma.map.findUnique.mockResolvedValue(erangelMap);
    // 원 중심 (0.5, 0.5), 반경 0.2
    mockPrisma.location.findMany.mockResolvedValue([
      makeLocation('loc-far', 0.5, 0.69),    // 거리 0.19 — 포함
      makeLocation('loc-near', 0.5, 0.51),   // 거리 0.01 — 포함
      makeLocation('loc-out', 0.5, 0.75),    // 거리 0.25 — 제외
      makeLocation('loc-mid', 0.5, 0.6),     // 거리 0.1 — 포함
    ]);

    const result = await service.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.2 },
      mapType: 'erangel',
    });

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('loc-near');
    expect(result[1].id).toBe('loc-mid');
    expect(result[2].id).toBe('loc-far');
    expect(result.every((l) => l.mapType === 'erangel')).toBe(true);
  });

  it('원 내부 위치 없음 → 빈 배열 반환', async () => {
    mockPrisma.map.findUnique.mockResolvedValue(erangelMap);
    mockPrisma.location.findMany.mockResolvedValue([
      makeLocation('loc-out', 0.9, 0.9),
    ]);

    const result = await service.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.1 },
      mapType: 'erangel',
    });

    expect(result).toHaveLength(0);
  });

  it('원 경계선 위의 위치(거리 정확히 r) → 포함됨', async () => {
    mockPrisma.map.findUnique.mockResolvedValue(erangelMap);
    // 거리 정확히 0.1 = r
    mockPrisma.location.findMany.mockResolvedValue([
      makeLocation('loc-boundary', 0.5, 0.6),
    ]);

    const result = await service.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.1 },
      mapType: 'erangel',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('loc-boundary');
  });

  it('맵이 존재하지 않으면 빈 배열 반환', async () => {
    mockPrisma.map.findUnique.mockResolvedValue(null);

    const result = await service.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.2 },
      mapType: 'taego',
    });

    expect(result).toHaveLength(0);
    expect(mockPrisma.location.findMany).not.toHaveBeenCalled();
  });

  it('최대 20개까지만 반환한다', async () => {
    mockPrisma.map.findUnique.mockResolvedValue(erangelMap);
    // 25개 위치 모두 원 내부
    const locations = Array.from({ length: 25 }, (_, i) =>
      makeLocation(`loc-${i}`, 0.5, 0.5),
    );
    mockPrisma.location.findMany.mockResolvedValue(locations);

    const result = await service.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.5 },
      mapType: 'erangel',
    });

    expect(result).toHaveLength(20);
  });
});
