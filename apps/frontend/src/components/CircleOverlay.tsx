'use client';
// WebSocket에서 수신한 CircleData를 Leaflet 지도 위에 자기장 원으로 오버레이하는 컴포넌트

import { Circle } from 'react-leaflet';
import type { CircleData } from '@pubg-helper/shared';

interface CircleOverlayProps {
  circleData: CircleData | null;
}

/**
 * CircleData의 0~1 정규화 좌표를 CRS.Simple 좌표계에 그대로 사용한다.
 * center: [y, x] (Leaflet lat/lng 순서), radius: r (좌표 단위)
 */
export function CircleOverlay({ circleData }: CircleOverlayProps) {
  if (!circleData) return null;

  return (
    <Circle
      center={[circleData.y, circleData.x]}
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
