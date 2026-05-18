// CaptureService 단위 테스트
import { describe, it, expect, beforeEach, vi } from 'vitest';
import sharp from 'sharp';
import { Test, TestingModule } from '@nestjs/testing';
import { CaptureService } from '../capture/capture.service';
import { MapDetectionService } from '../capture/map-detection.service';
import { CircleService } from '../capture/circle.service';

/** sharp.extract가 동작하려면 유효한 jpeg 필요. 200×200 단색 이미지 base64 생성. */
async function makeValidBase64(): Promise<string> {
  const buf = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 30, g: 30, b: 30 } },
  })
    .jpeg()
    .toBuffer();
  return buf.toString('base64');
}

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

  it('맵 영역이 검출되지 않으면 null 반환', async () => {
    const base64 = await makeValidBase64();
    mapDetection.detectMapArea.mockResolvedValue(null);
    expect(await service.processFrame(base64, 1)).toBeNull();
    expect(circleService.extractCircle).not.toHaveBeenCalled();
  });

  it('맵 영역이 검출되면 원 추출 결과 반환', async () => {
    const base64 = await makeValidBase64();
    const circle = { x: 0.5, y: 0.4, r: 0.2, phase: 1 };
    mapDetection.detectMapArea.mockResolvedValue({ left: 50, top: 0, width: 100, height: 100 });
    circleService.extractCircle.mockResolvedValue(circle);

    expect(await service.processFrame(base64, 1)).toEqual(circle);
  });

  it('맵 영역 검출됐지만 원 추출 실패 시 null 반환', async () => {
    const base64 = await makeValidBase64();
    mapDetection.detectMapArea.mockResolvedValue({ left: 50, top: 0, width: 100, height: 100 });
    circleService.extractCircle.mockResolvedValue(null);

    expect(await service.processFrame(base64, 1)).toBeNull();
  });
});
