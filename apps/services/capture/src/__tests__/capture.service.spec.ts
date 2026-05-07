// CaptureService 단위 테스트
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CaptureService } from '../capture/capture.service';
import { MapDetectionService } from '../capture/map-detection.service';
import { CircleService } from '../capture/circle.service';

describe('CaptureService', () => {
  let service: CaptureService;
  let mapDetection: { isMapOpen: ReturnType<typeof vi.fn> };
  let circleService: { extractCircle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mapDetection = { isMapOpen: vi.fn() };
    circleService = { extractCircle: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptureService,
        { provide: MapDetectionService, useValue: mapDetection },
        { provide: CircleService, useValue: circleService },
      ],
    }).compile();

    service = module.get<CaptureService>(CaptureService);
  });

  it('전체맵이 닫혀 있으면 null 반환', async () => {
    mapDetection.isMapOpen.mockResolvedValue(false);
    expect(await service.processFrame('base64')).toBeNull();
    expect(circleService.extractCircle).not.toHaveBeenCalled();
  });

  it('전체맵이 열리면 원 추출 결과 반환', async () => {
    const circle = { x: 0.5, y: 0.4, r: 0.2 };
    mapDetection.isMapOpen.mockResolvedValue(true);
    circleService.extractCircle.mockResolvedValue(circle);

    expect(await service.processFrame('base64')).toEqual(circle);
  });

  it('전체맵이 열렸지만 원 추출 실패 시 null 반환', async () => {
    mapDetection.isMapOpen.mockResolvedValue(true);
    circleService.extractCircle.mockResolvedValue(null);

    expect(await service.processFrame('base64')).toBeNull();
  });
});
