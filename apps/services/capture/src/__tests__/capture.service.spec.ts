// CaptureService 단위 테스트
import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CaptureService } from '../capture/capture.service';

describe('CaptureService', () => {
  let service: CaptureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaptureService],
    }).compile();

    service = module.get<CaptureService>(CaptureService);
  });

  it('processFrame은 현재 null을 반환한다 (U9 구현 전)', async () => {
    const result = await service.processFrame('base64data');
    expect(result).toBeNull();
  });
});
