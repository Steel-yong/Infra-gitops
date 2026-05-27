'use client';
// 플레이어(유저 본인) 위치를 방향 화살표 마커로 Leaflet 지도에 렌더링하는 컴포넌트
import { Marker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { PlayerPosition } from '@pubg-helper/shared';

/**
 * heading(도, 0=북, 시계방향)으로 회전한 플레이어 화살표 divIcon.
 * heading이 없으면 방향 없는 점 마커.
 */
function playerIcon(heading?: number) {
  const inner =
    typeof heading === 'number'
      ? `<div class="player-arrow" style="transform: rotate(${heading}deg)"></div>`
      : `<div class="player-dot"></div>`;
  return divIcon({
    className: '',
    html: `<div class="player-marker">${inner}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface PlayerMarkerProps {
  player: PlayerPosition | null;
}

export function PlayerMarker({ player }: PlayerMarkerProps) {
  if (!player) return null;
  // 이미지 좌표(위 0→아래 1)를 Leaflet(남→북)으로 [1 - y, x] 변환 (CircleOverlay·StashMarkers와 통일).
  return <Marker position={[1 - player.y, player.x]} icon={playerIcon(player.heading)} />;
}
