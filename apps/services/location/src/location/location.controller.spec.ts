// LocationController 단위 테스트 — POST /locations/recommend 엔드포인트
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import type { LocationData } from '@pubg-helper/shared';

const mockLocationService = {
  recommend: vi.fn(),
  findAll: vi.fn(),
};

const mockResult: LocationData[] = [
  {
    id: 'loc-1',
    coordX: 0.5,
    coordY: 0.55,
    tier: 'S',
    proTeamNames: ['TeamA'],
    usageCount: 10,
    mapType: 'erangel',
  },
];

describe('LocationController', () => {
  let controller: LocationController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [{ provide: LocationService, useValue: mockLocationService }],
    }).compile();
    controller = module.get<LocationController>(LocationController);
  });

  it('컨트롤러가 정의된다', () => {
    expect(controller).toBeDefined();
  });

  it('POST recommend — 서비스 결과를 반환한다', async () => {
    mockLocationService.recommend.mockResolvedValue(mockResult);

    const result = await controller.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.2 },
      mapType: 'erangel',
    });

    expect(result).toEqual(mockResult);
    expect(mockLocationService.recommend).toHaveBeenCalledWith({
      circle: { x: 0.5, y: 0.5, r: 0.2 },
      mapType: 'erangel',
    });
  });

  it('POST recommend — 빈 배열도 그대로 반환한다', async () => {
    mockLocationService.recommend.mockResolvedValue([]);

    const result = await controller.recommend({
      circle: { x: 0.5, y: 0.5, r: 0.01 },
      mapType: 'taego',
    });

    expect(result).toEqual([]);
  });

  it('GET / — mapType 쿼리를 서비스에 전달하고 결과를 반환한다', async () => {
    mockLocationService.findAll.mockResolvedValue(mockResult);

    const result = await controller.findAll('erangel');

    expect(result).toEqual(mockResult);
    expect(mockLocationService.findAll).toHaveBeenCalledWith('erangel');
  });

  it('GET / — 결과가 비면 빈 배열을 그대로 반환한다', async () => {
    mockLocationService.findAll.mockResolvedValue([]);

    const result = await controller.findAll('taego');

    expect(result).toEqual([]);
    expect(mockLocationService.findAll).toHaveBeenCalledWith('taego');
  });
});
