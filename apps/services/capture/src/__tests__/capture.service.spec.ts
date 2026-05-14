// CaptureService 단위 테스트 (detectMapArea + extractCircle 연동)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CaptureService } from '../capture/capture.service';
import { MapDetectionService } from '../capture/map-detection.service';
import { CircleService } from '../capture/circle.service';

describe('CaptureService', () => {
  let service: CaptureService;
  let mapDetection: { detectMapArea: ReturnType<typeof vi.fn> };
  let circleService: { extractCircle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mapDetection = { detectMapArea: vi.fn() };
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

  it('맵 영역 검출 실패 (null) → null 반환, extractCircle 미호출', async () => {
    mapDetection.detectMapArea.mockResolvedValue(null);
    expect(await service.processFrame('base64')).toBeNull();
    expect(circleService.extractCircle).not.toHaveBeenCalled();
  });

  it('맵 영역 검출 성공 → 해당 영역으로 extractCircle 호출, 원 반환', async () => {
    const mapArea = { left: 420, top: 0, width: 1080, height: 1080 };
    const circle = { x: 0.5, y: 0.4, r: 0.2 };
    mapDetection.detectMapArea.mockResolvedValue(mapArea);
    circleService.extractCircle.mockResolvedValue(circle);

    expect(await service.processFrame('base64')).toEqual(circle);
    expect(circleService.extractCircle).toHaveBeenCalledWith('base64', mapArea);
  });

  it('맵 영역 검출 성공했지만 원 추출 실패 → null', async () => {
    mapDetection.detectMapArea.mockResolvedValue({ left: 0, top: 0, width: 100, height: 100 });
    circleService.extractCircle.mockResolvedValue(null);

    expect(await service.processFrame('base64')).toBeNull();
  });
});
