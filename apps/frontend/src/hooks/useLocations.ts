// location-service에서 CircleData 기반 프로 추천 위치를 조회하는 훅
import { useEffect, useState } from 'react';
import type { CircleData, LocationData, MapType } from '@pubg-helper/shared';

const LOCATION_SERVICE_URL =
  process.env.NEXT_PUBLIC_LOCATION_SERVICE_URL ?? 'http://localhost:3002';

export interface UseLocationsReturn {
  locations: LocationData[];
  loading: boolean;
  error: string | null;
}

/**
 * circleData가 null이면 locations를 비우고 API를 호출하지 않는다.
 * circleData 또는 mapType이 바뀌면 POST /locations/recommend를 재호출한다.
 */
export function useLocations(
  circleData: CircleData | null,
  mapType: MapType,
): UseLocationsReturn {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!circleData) {
      setLocations([]);
      return;
    }

    let cancelled = false;

    async function fetchLocations() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${LOCATION_SERVICE_URL}/locations/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ circle: circleData, mapType }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: LocationData[] = await res.json();
        if (!cancelled) setLocations(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '위치 조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLocations();
    return () => {
      cancelled = true;
    };
  }, [circleData, mapType]);

  return { locations, loading, error };
}
