// useStashLocations 훅 테스트 — fetch 호출 + 비밀창고 필터 + 에러 처리
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStashLocations } from '../hooks/useStashLocations';
import type { LocationData } from '@pubg-helper/shared';

const SERVICE_URL = 'http://localhost:3002';

const makeLoc = (id: string, names: string[]): LocationData => ({
  id,
  coordX: 0.5,
  coordY: 0.5,
  tier: 'S',
  proTeamNames: names,
  usageCount: 0,
  mapType: 'erangel',
});

describe('useStashLocations', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('마운트 시 GET /locations?mapType={mapType} 호출', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve([]),
    });

    renderHook(() => useStashLocations('erangel'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`${SERVICE_URL}/locations?mapType=erangel`);
    });
  });

  it('proTeamNames에 "비밀창고" 포함 항목만 반환한다', async () => {
    const all = [
      makeLoc('stash-1', ['비밀창고']),
      makeLoc('pro-1', ['젠지']),
      makeLoc('stash-2', ['비밀창고']),
      makeLoc('pro-2', ['T1', '비밀창고']),
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve(all),
    });

    const { result } = renderHook(() => useStashLocations('erangel'));

    await waitFor(() => {
      expect(result.current.map((l) => l.id).sort()).toEqual([
        'pro-2',
        'stash-1',
        'stash-2',
      ]);
    });
  });

  it('fetch 실패 시 빈 배열을 유지한다', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useStashLocations('taego'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    expect(result.current).toEqual([]);
  });

  it('mapType 변경 시 새 URL로 재요청', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve([]),
    });

    const { rerender } = renderHook(({ m }: { m: 'erangel' | 'taego' }) => useStashLocations(m), {
      initialProps: { m: 'erangel' },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`${SERVICE_URL}/locations?mapType=erangel`);
    });

    rerender({ m: 'taego' });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(`${SERVICE_URL}/locations?mapType=taego`);
    });
  });

  it('초기 상태는 빈 배열이다', () => {
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStashLocations('erangel'));
    expect(result.current).toEqual([]);
  });
});
