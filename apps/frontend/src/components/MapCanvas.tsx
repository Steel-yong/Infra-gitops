'use client';
// 선택된 맵 이미지를 Leaflet CRS.Simple 좌표계로 렌더링하는 캔버스 컴포넌트

import { useEffect } from 'react';
import { MapContainer, ImageOverlay, useMap } from 'react-leaflet';
import { CRS } from 'leaflet';
import type { MapType } from '@pubg-helper/shared';
import styles from './MapCanvas.module.css';

/** 0~1 정규화 좌표계 경계. CircleOverlay와 좌표계를 공유한다. */
const BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [1, 1],
];

/** 맵 타입이 바뀔 때 Leaflet 뷰를 전체 경계로 리셋하는 내부 컴포넌트. */
function MapUpdater({ mapType }: { mapType: MapType }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(BOUNDS, { padding: [0, 0] });
    const size = map.getSize();
    if (size.x > size.y) {
      const currentZoom = map.getZoom();
      const ratio = size.x / size.y;
      map.setZoom(currentZoom + Math.log2(ratio), { animate: false });
    }
    // 보정된 줌을 최소 줌으로 고정 — 사용자가 더 축소해서 맵이 작아지지 않게.
    map.setMinZoom(map.getZoom());
  }, [mapType, map]);
  return null;
}

interface MapCanvasProps {
  mapType: MapType;
  children?: React.ReactNode;
}

/**
 * 선택된 맵 이미지를 Leaflet 위에 렌더링한다.
 * children은 MapContainer 안에서 렌더링된다 (CircleOverlay 등 Leaflet 컨텍스트 필요 컴포넌트용).
 * SSR 비활성화 필요: next/dynamic으로 import할 것.
 */
export default function MapCanvas({ mapType, children }: MapCanvasProps) {
  return (
    <div className={styles.container}>
      <MapContainer
        crs={CRS.Simple}
        bounds={BOUNDS}
        maxBounds={BOUNDS}
        maxBoundsViscosity={1.0}
        className={styles.map}
        zoomControl
        attributionControl={false}
      >
        <ImageOverlay url={`/maps/${mapType}.jpg`} bounds={BOUNDS} />
        <MapUpdater mapType={mapType} />
        {children}
      </MapContainer>
    </div>
  );
}
