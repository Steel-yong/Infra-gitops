'use client';
// 선택된 맵 이미지를 Leaflet CRS.Simple 좌표계로 렌더링하는 캔버스 컴포넌트

import { useEffect } from 'react';
import { MapContainer, ImageOverlay, useMap } from 'react-leaflet';
import { CRS } from 'leaflet';
import type { MapType } from '@pubg-helper/shared';
import styles from './MapCanvas.module.css';
import 'leaflet/dist/leaflet.css';

/** 0~1 정규화 좌표계 경계. CircleOverlay와 좌표계를 공유한다. */
const BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [1, 1],
];

/** 맵 타입이 바뀔 때 Leaflet 뷰를 전체 경계로 리셋하는 내부 컴포넌트. */
function MapUpdater({ mapType }: { mapType: MapType }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(BOUNDS);
  }, [mapType, map]);
  return null;
}

interface MapCanvasProps {
  mapType: MapType;
}

/**
 * 선택된 맵 이미지를 Leaflet 위에 렌더링한다.
 * SSR 비활성화 필요: next/dynamic으로 import할 것.
 */
export default function MapCanvas({ mapType }: MapCanvasProps) {
  return (
    <div className={styles.container}>
      <MapContainer
        crs={CRS.Simple}
        bounds={BOUNDS}
        className={styles.map}
        zoomControl
        attributionControl={false}
      >
        <ImageOverlay url={`/maps/${mapType}.jpg`} bounds={BOUNDS} />
        <MapUpdater mapType={mapType} />
      </MapContainer>
    </div>
  );
}
