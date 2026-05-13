'use client';
// WebSocket에서 수신한 CircleData를 Leaflet 지도 위에 자기장 원으로 오버레이하는 컴포넌트

import { Circle } from 'react-leaflet';
import type { CircleData } from '@pubg-helper/shared';

interface CircleOverlayProps {
  circleData: CircleData | null;
}

/**
 * CircleData의 0~1 좌표는 이미지 좌표계(북→남 0→1)이고,
 * Leaflet CRS.Simple은 lat이 위로 증가(남→북 0→1)이므로 y축을 뒤집어 그린다.
 * LocationMarkers·StashMarkers와 동일한 1-y 변환으로 좌표계를 통일한다.
 */
export function CircleOverlay({ circleData }: CircleOverlayProps) {
  if (!circleData) return null;

  return (
    <Circle
      center={[1 - circleData.y, circleData.x]}
      radius={circleData.r}
      pathOptions={{
        color: '#4488ff',
        fillColor: '#4488ff',
        fillOpacity: 0.15,
        weight: 2,
      }}
    />
  );
}
