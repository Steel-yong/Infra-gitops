'use client';
// 프로 추천 위치를 S/A/B 등급별 색상 마커로 Leaflet 지도에 렌더링하는 컴포넌트

import { CircleMarker, Tooltip } from 'react-leaflet';
import type { LocationData, LocationTier } from '@pubg-helper/shared';

/** S=금색, A=은색, B=동색 */
const TIER_COLORS: Record<LocationTier, string> = {
  S: '#FFD700',
  A: '#C0C0C0',
  B: '#CD7F32',
};

interface LocationMarkersProps {
  locations: LocationData[];
}

/**
 * CRS.Simple 좌표계 기준 center=[coordY, coordX].
 * MapCanvas children으로 렌더링해야 Leaflet 컨텍스트를 사용할 수 있다.
 */
export function LocationMarkers({ locations }: LocationMarkersProps) {
  return (
    <>
      {locations.map((loc) => (
        <CircleMarker
          key={loc.id}
          center={[loc.coordY, loc.coordX]}
          radius={8}
          pathOptions={{
            color: TIER_COLORS[loc.tier],
            fillColor: TIER_COLORS[loc.tier],
            fillOpacity: 0.8,
            weight: 2,
          }}
        >
          <Tooltip>{loc.proTeamNames[0]} ({loc.tier})</Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
