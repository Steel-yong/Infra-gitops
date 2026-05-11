// PrismaService 단위 테스트
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {
    async $connect(): Promise<void> {}
    async $queryRaw(): Promise<unknown[]> {
      return [{ '?column?': 1 }];
    }
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('서비스가 정의된다', () => {
    expect(service).toBeDefined();
  });

  it('isHealthy: $queryRaw 성공 시 true를 반환한다', async () => {
    const result = await service.isHealthy();
    expect(result).toBe(true);
  });

  it('isHealthy: $queryRaw 실패 시 false를 반환한다', async () => {
    vi.spyOn(service, '$queryRaw' as keyof PrismaService).mockRejectedValueOnce(
      new Error('connection refused') as never,
    );
    const result = await service.isHealthy();
    expect(result).toBe(false);
  });
});
