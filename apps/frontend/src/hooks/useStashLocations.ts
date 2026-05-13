// 맵 타입별 비밀창고 위치를 전체 조회하는 훅 — 자기장 필터 없이 항상 표시
import { useEffect, useState } from 'react';
import type { LocationData, MapType } from '@pubg-helper/shared';

const LOCATION_SERVICE_URL =
  process.env.NEXT_PUBLIC_LOCATION_SERVICE_URL ?? 'http://localhost:3002';

export function useStashLocations(mapType: MapType): LocationData[] {
  const [stashes, setStashes] = useState<LocationData[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${LOCATION_SERVICE_URL}/locations?mapType=${mapType}`)
      .then((res) => res.json())
      .then((data: LocationData[]) => {
        if (!cancelled) {
          setStashes(data.filter((loc) => loc.proTeamNames.includes('비밀창고')));
        }
      })
      .catch(() => {
        if (!cancelled) setStashes([]);
      });

    return () => { cancelled = true; };
  }, [mapType]);

  return stashes;
}
