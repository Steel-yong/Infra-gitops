// CaptureGateway WebSocket 메시지 핸들러 단위 테스트
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CaptureGateway } from '../capture/capture.gateway';
import { CaptureService } from '../capture/capture.service';
import { SocketEvents } from '@pubg-helper/shared';
import type { Socket } from 'socket.io';
import type { CircleData } from '@pubg-helper/shared';

function makeMockClient(): { emit: ReturnType<typeof vi.fn> } & Partial<Socket> {
  return { emit: vi.fn() };
}

describe('CaptureGateway', () => {
  let gateway: CaptureGateway;
  const processFrameMock = vi.fn();

  beforeEach(async () => {
    processFrameMock.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptureGateway,
        {
          provide: CaptureService,
          useValue: { processFrame: processFrameMock },
        },
      ],
    }).compile();

    gateway = module.get<CaptureGateway>(CaptureGateway);
  });

  it('processFrame이 CircleData를 반환하면 CIRCLE_RESULT를 emit한다', async () => {
    const circle: CircleData = { x: 0.5, y: 0.5, r: 0.2, phase: 1 };
    processFrameMock.mockResolvedValue(circle);

    const client = makeMockClient();
    client.id = 'test-client-1';
    await gateway.handleFrame(
      { base64: 'base64data', isShrinking: false, currentPhase: 1, parentCircle: undefined },
      client as unknown as Socket,
    );

    expect(client.emit).toHaveBeenCalledWith(SocketEvents.CIRCLE_RESULT, circle);
  });

  it('processFrame이 null을 반환하면 NO_MAP을 emit한다', async () => {
    processFrameMock.mockResolvedValue(null);

    const client = makeMockClient();
    client.id = 'test-client-2';
    await gateway.handleFrame(
      { base64: 'base64data', isShrinking: false, currentPhase: 1, parentCircle: undefined },
      client as unknown as Socket,
    );

    expect(client.emit).toHaveBeenCalledWith(SocketEvents.NO_MAP);
  });

  it('OCR 게이트키퍼 — currentPhase 없으면 NO_MAP emit하고 processFrame 호출 안 함', async () => {
    const client = makeMockClient();
    client.id = 'test-client-3';
    await gateway.handleFrame(
      { base64: 'base64data', isShrinking: false, currentPhase: null, parentCircle: undefined },
      client as unknown as Socket,
    );

    expect(client.emit).toHaveBeenCalledWith(SocketEvents.NO_MAP);
    expect(processFrameMock).not.toHaveBeenCalled();
  });
});
