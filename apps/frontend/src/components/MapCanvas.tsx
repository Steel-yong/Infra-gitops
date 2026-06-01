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
    // 이전 맵의 minZoom 잠금 해제 (안전장치).
    map.setMinZoom(-10);
    // animate:false 필수 — 애니메이션되면 직후 getZoom()이 이전(확대했던) 줌값을 반환해
    // 그게 새 맵 minZoom으로 잘못 고정됨 (맵 전환 시 확대 상태가 최소줌으로 박히던 버그).
    // contain fit — 정사각 맵 전체가 화면 안에 들어오게 맞춤. 이 값을 최소 줌으로 고정.
    // (가로 채움(cover) 줌인은 위/아래를 잘라 전체맵이 안 보였으므로 제거.)
    map.fitBounds(BOUNDS, { padding: [0, 0], animate: false });
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
        preferCanvas
        zoomSnap={0.5}
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
