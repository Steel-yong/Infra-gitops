// 페이즈 OCR 오인식("페이즈 1" → "21") 회귀 — 마지막 [1-8] 추출
import { describe, it, expect } from 'vitest';
import { parsePhaseString } from '../workers/timer-ocr-utils';

describe('parsePhaseString', () => {
  it('OCR 정상: "1" → 1', () => expect(parsePhaseString('1')).toBe(1));
  it('OCR 정상: "8" → 8', () => expect(parsePhaseString('8')).toBe(8));
  it('"페이즈"가 "2"로 오인식돼 "21" 나와도 마지막 자리 1 추출', () =>
    expect(parsePhaseString('21')).toBe(1));
  it('"페이즈 5" → "25" → 5', () => expect(parsePhaseString('25')).toBe(5));
  it('"페이즈 8" → "28" → 8', () => expect(parsePhaseString('28')).toBe(8));
  it('숫자 없으면 null', () => expect(parsePhaseString('페이즈')).toBeNull());
  it('범위 밖(9) 무시', () => expect(parsePhaseString('9')).toBeNull());
  it('잡음 끝에 페이즈: "abc:?2" → 2', () => expect(parsePhaseString('abc:?2')).toBe(2));
});
