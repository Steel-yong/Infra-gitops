// useMyungdang 테스트 — 정적 JSON fetch (성공/실패/맵별 URL)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyungdang } from '../hooks/useMyungdang';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMyungdang', () => {
  it('성공 시 points를 반환한다', async () => {
    const points = [{ gx: 0.1, gy: 0.2, tier: 'S', count: 5 }];
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ points }) }) as unknown as typeof fetch;
    const { result } = renderHook(() => useMyungdang('erangel'));
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].tier).toBe('S');
  });

  it('HTTP 실패 시 빈 배열을 유지한다', async () => {
    const f = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    global.fetch = f as unknown as typeof fetch;
    const { result } = renderHook(() => useMyungdang('erangel'));
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('fetch 거부 시 빈 배열을 유지한다', async () => {
    const f = vi.fn().mockRejectedValue(new Error('network'));
    global.fetch = f as unknown as typeof fetch;
    const { result } = renderHook(() => useMyungdang('taego'));
    await waitFor(() => expect(f).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('mapType에 맞는 URL을 호출한다', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ points: [] }) });
    global.fetch = f as unknown as typeof fetch;
    renderHook(() => useMyungdang('erangel'));
    await waitFor(() => expect(f).toHaveBeenCalledWith('/data/myungdang-erangel.json'));
  });
});
