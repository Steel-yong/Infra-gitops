// location-service 헬스체크 엔드포인트 단위 테스트
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 스키마에 모델이 없어 prisma generate 불가 → @prisma/client 전체 mock
vi.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AppController } from '../app.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;
  let isHealthyMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    isHealthyMock = vi.fn().mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: { isHealthy: isHealthyMock } }],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('DB 연결 성공 시 { status: "ok", db: "connected" }를 반환한다', async () => {
    const result = await controller.health();
    expect(result).toEqual({ status: 'ok', db: 'connected' });
  });

  it('DB 연결 실패 시 503 예외를 던진다', async () => {
    isHealthyMock.mockResolvedValueOnce(false);
    await expect(controller.health()).rejects.toThrow(HttpException);
  });
});
