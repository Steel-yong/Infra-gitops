// capture-service 헬스체크 엔드포인트 단위 테스트
import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('GET /health는 { status: "ok" }를 반환한다', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
