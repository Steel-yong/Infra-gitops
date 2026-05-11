// ocrWorker 순수 함수 및 메시지 핸들러 단위 테스트

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseTimerString,
  detectExclamationMark,
  getTimerRegion,
  TIMER_REGIONS,
} from '../workers/ocrWorker';

describe('parseTimerString', () => {
  it('"1:38" → 98초', () => {
    expect(parseTimerString('1:38')).toBe(98);
  });

  it('"0:10" → 10초', () => {
    expect(parseTimerString('0:10')).toBe(10);
  });

  it('"2:00" → 120초', () => {
    expect(parseTimerString('2:00')).toBe(120);
  });

  it('"0:00" → 0초', () => {
    expect(parseTimerString('0:00')).toBe(0);
  });

  it('" 1:38 " → 98초 (앞뒤 공백 trim)', () => {
    expect(parseTimerString(' 1:38 ')).toBe(98);
  });

  it('"1:3X" → null (파싱 불가)', () => {
    expect(parseTimerString('1:3X')).toBeNull();
  });

  it('":38" → null (분 없음)', () => {
    expect(parseTimerString(':38')).toBeNull();
  });

  it('"1:60" → null (초 범위 초과)', () => {
    expect(parseTimerString('1:60')).toBeNull();
  });

  it('빈 문자열 → null', () => {
    expect(parseTimerString('')).toBeNull();
  });
});

describe('detectExclamationMark', () => {
  it('빨간 픽셀 비율 10% (5% 초과) → true', () => {
    // 10픽셀 중 1픽셀 빨간색 = 10%
    const pixels = new Uint8ClampedArray(10 * 4);
    pixels[0] = 210; // r > 200
    pixels[1] = 50;  // g < 80
    pixels[2] = 50;  // b < 80
    pixels[3] = 255;
    expect(detectExclamationMark(pixels)).toBe(true);
  });

  it('빨간 픽셀 비율 1% (5% 이하) → false', () => {
    // 100픽셀 중 1픽셀 빨간색 = 1%
    const pixels = new Uint8ClampedArray(100 * 4);
    pixels[0] = 210;
    pixels[1] = 50;
    pixels[2] = 50;
    pixels[3] = 255;
    expect(detectExclamationMark(pixels)).toBe(false);
  });

  it('빈 픽셀 배열 → false', () => {
    expect(detectExclamationMark(new Uint8ClampedArray(0))).toBe(false);
  });

  it('단일 빨간 픽셀 (100%) → true', () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
    expect(detectExclamationMark(pixels)).toBe(true);
  });

  it('r=200 경계값 (>200 미충족) → false', () => {
    const pixels = new Uint8ClampedArray([200, 50, 50, 255]);
    expect(detectExclamationMark(pixels)).toBe(false);
  });

  it('g=80 경계값 (<80 미충족) → false', () => {
    const pixels = new Uint8ClampedArray([210, 80, 50, 255]);
    expect(detectExclamationMark(pixels)).toBe(false);
  });

  it('모든 픽셀이 파란색 → false', () => {
    const pixels = new Uint8ClampedArray([0, 0, 255, 255]);
    expect(detectExclamationMark(pixels)).toBe(false);
  });
});

describe('getTimerRegion', () => {
  it('1920x1080 → TIMER_REGIONS["1920x1080"]', () => {
    expect(getTimerRegion(1920, 1080)).toEqual(TIMER_REGIONS['1920x1080']);
  });

  it('2560x1440 → TIMER_REGIONS["2560x1440"]', () => {
    expect(getTimerRegion(2560, 1440)).toEqual(TIMER_REGIONS['2560x1440']);
  });

  it('3840x2160 → TIMER_REGIONS["3840x2160"]', () => {
    expect(getTimerRegion(3840, 2160)).toEqual(TIMER_REGIONS['3840x2160']);
  });

  it('알 수 없는 해상도(1280x720) → 1920x1080 폴백', () => {
    expect(getTimerRegion(1280, 720)).toEqual(TIMER_REGIONS['1920x1080']);
  });

  it('1920x1080 반환값은 올바른 좌표를 가진다', () => {
    const region = getTimerRegion(1920, 1080);
    expect(region).toEqual({ x: 1680, y: 820, w: 180, h: 35 });
  });
});

describe('ocrWorker onmessage 핸들러', () => {
  let postedMessages: unknown[] = [];
  let onMessage: ((event: MessageEvent) => void) | null = null;

  beforeEach(async () => {
    postedMessages = [];
    vi.stubGlobal('self', {
      postMessage: (msg: unknown) => postedMessages.push(msg),
      onmessage: null,
    });
    vi.resetModules();
    await import('../workers/ocrWorker');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onMessage = (self as any).onmessage as ((event: MessageEvent) => void) | null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('STOP 메시지 → postMessage 없음', () => {
    onMessage!({ data: { type: 'STOP' } } as MessageEvent);
    expect(postedMessages).toHaveLength(0);
  });

  it('"1:38" + 느낌표 없음 → TIMER_STATE(98, false)', () => {
    const pixels = new Array(40).fill(0); // 10픽셀 모두 0
    onMessage!({ data: { type: 'PROCESS', text: '1:38', pixels, width: 10, height: 1 } } as MessageEvent);
    expect(postedMessages).toHaveLength(1);
    const msg = postedMessages[0] as { type: string; remainingSeconds: number; isShrinking: boolean };
    expect(msg.type).toBe('TIMER_STATE');
    expect(msg.remainingSeconds).toBe(98);
    expect(msg.isShrinking).toBe(false);
  });

  it('"0:10" + 빨간 픽셀(느낌표 있음) → TIMER_STATE(10, true)', () => {
    // 10픽셀 중 1픽셀 빨간색(10% > 5%)
    const pixels = new Array(40).fill(0);
    pixels[0] = 210; pixels[1] = 50; pixels[2] = 50; pixels[3] = 255;
    onMessage!({ data: { type: 'PROCESS', text: '0:10', pixels, width: 10, height: 1 } } as MessageEvent);
    const msg = postedMessages[0] as { type: string; remainingSeconds: number; isShrinking: boolean };
    expect(msg.type).toBe('TIMER_STATE');
    expect(msg.remainingSeconds).toBe(10);
    expect(msg.isShrinking).toBe(true);
  });

  it('"1:3X" (파싱 불가) → TIMER_STATE(null, false)', () => {
    const pixels = new Array(40).fill(0);
    onMessage!({ data: { type: 'PROCESS', text: '1:3X', pixels, width: 10, height: 1 } } as MessageEvent);
    const msg = postedMessages[0] as { type: string; remainingSeconds: null };
    expect(msg.type).toBe('TIMER_STATE');
    expect(msg.remainingSeconds).toBeNull();
  });

  it('느낌표 없음 → isShrinking=false, 알림 없이 타이머만 표시', () => {
    const pixels = new Array(40).fill(0);
    onMessage!({ data: { type: 'PROCESS', text: '0:30', pixels, width: 10, height: 1 } } as MessageEvent);
    const msg = postedMessages[0] as { type: string; isShrinking: boolean };
    expect(msg.isShrinking).toBe(false);
  });

  it('처리 중 Error 예외 발생 시 err.message로 ERROR를 postMessage한다', () => {
    vi.stubGlobal('Uint8ClampedArray', function() { throw new Error('처리 오류'); });
    onMessage!({ data: { type: 'PROCESS', text: '1:38', pixels: [], width: 10, height: 1 } } as MessageEvent);
    const msg = postedMessages[0] as { type: string; message: string };
    expect(msg.type).toBe('ERROR');
    expect(msg.message).toBe('처리 오류');
  });

  it('Error가 아닌 예외 발생 시 "OCR 처리 실패"로 ERROR를 postMessage한다', () => {
    vi.stubGlobal('Uint8ClampedArray', function() { throw 'non-error'; });
    onMessage!({ data: { type: 'PROCESS', text: '1:38', pixels: [], width: 10, height: 1 } } as MessageEvent);
    const msg = postedMessages[0] as { type: string; message: string };
    expect(msg.type).toBe('ERROR');
    expect(msg.message).toBe('OCR 처리 실패');
  });
});
