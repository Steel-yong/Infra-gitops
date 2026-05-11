// useLocations 훅 테스트 — fetch mock 사용
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { CircleData, LocationData } from '@pubg-helper/shared';
import { useLocations } from '../hooks/useLocations';

const mockLocations: LocationData[] = [
  {
    id: '1',
    coordX: 0.4,
    coordY: 0.4,
    tier: 'S',
    proTeamNames: ['팀A'],
    usageCount: 10,
    mapType: 'erangel',
  },
  {
    id: '2',
    coordX: 0.6,
    coordY: 0.6,
    tier: 'A',
    proTeamNames: ['팀B'],
    usageCount: 5,
    mapType: 'erangel',
  },
];

const mockCircle: CircleData = { x: 0.5, y: 0.5, r: 0.2 };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useLocations', () => {
  it('circleData가 null이면 API를 호출하지 않고 빈 배열을 반환한다', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { result } = renderHook(() => useLocations(null, 'erangel'));
    expect(result.current.locations).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('circleData 수신 시 POST /locations/recommend를 호출한다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockLocations,
    } as Response);

    renderHook(() => useLocations(mockCircle, 'erangel'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/locations/recommend'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('API 성공 응답 시 locations가 설정된다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockLocations,
    } as Response);

    const { result } = renderHook(() => useLocations(mockCircle, 'erangel'));

    await waitFor(() => {
      expect(result.current.locations).toEqual(mockLocations);
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('API 빈 배열 응답 시 locations가 빈 배열이 된다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { result } = renderHook(() => useLocations(mockCircle, 'erangel'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.locations).toEqual([]);
  });

  it('API 에러 응답 시 error 상태가 설정된다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useLocations(mockCircle, 'erangel'));

    await waitFor(() => {
      expect(result.current.error).toBe('HTTP 500');
    });
    expect(result.current.locations).toEqual([]);
  });

  it('네트워크 에러 시 error 상태가 설정된다', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useLocations(mockCircle, 'erangel'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('circleData가 null로 바뀌면 locations가 초기화된다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockLocations,
    } as Response);

    const { result, rerender } = renderHook(
      ({ circle }) => useLocations(circle, 'erangel'),
      { initialProps: { circle: mockCircle as CircleData | null } },
    );

    await waitFor(() => {
      expect(result.current.locations).toEqual(mockLocations);
    });

    rerender({ circle: null });
    expect(result.current.locations).toEqual([]);
  });
});
