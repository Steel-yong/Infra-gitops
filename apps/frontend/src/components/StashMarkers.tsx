'use client';
// 비밀창고 위치를 펄싱 금색 마커로 Leaflet 지도에 렌더링하는 컴포넌트

import { Marker, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { LocationData } from '@pubg-helper/shared';

const stashIcon = divIcon({
  className: '',
  html: '<div class="stash-marker"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  tooltipAnchor: [12, 0],
});

interface StashMarkersProps {
  stashes: LocationData[];
}

export function StashMarkers({ stashes }: StashMarkersProps) {
  return (
    <>
      {stashes.map((stash) => (
        <Marker key={stash.id} position={[1 - stash.coordY, stash.coordX]} icon={stashIcon}>
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>💰 비밀창고</span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
