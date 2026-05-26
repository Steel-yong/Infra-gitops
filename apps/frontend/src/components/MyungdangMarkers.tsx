'use client';
// 명당(프로 위치)을 등급별 도넛 마커로 Leaflet 지도에 렌더링하는 컴포넌트

import { CircleMarker, Tooltip } from 'react-leaflet';
import type { CircleData } from '@pubg-helper/shared';
import { TIER_COLOR, type MyungdangPoint, type MyungdangTier } from '../hooks/useMyungdang';

/** 크기 최대 = A(주황). S도 A와 동일 캡(빨강이 너무 커서). B<A, C 최소. */
const TIER_RADIUS: Record<MyungdangTier, number> = {
  S: 6,
  A: 6,
  B: 5,
  C: 4,
};

interface MyungdangMarkersProps {
  points: MyungdangPoint[];
  /** 등급별 표시 여부. false면 해당 등급 숨김. */
  visibleTiers: Record<MyungdangTier, boolean>;
  /** 자기장 원. 있으면 원 안의 명당만 표시(다른 지역은 숨김). null이면 전체. */
  zone?: CircleData | null;
}

/** 명당이 자기장 원 안에 있는지 (좌표·반경 모두 0~1 정규화, 같은 이미지 좌표계). */
function insideZone(p: MyungdangPoint, zone: CircleData): boolean {
  const dx = p.gx - zone.x;
  const dy = p.gy - zone.y;
  return dx * dx + dy * dy <= zone.r * zone.r;
}

/**
 * 도넛(속 빈 링) 마커로 명당을 표시한다 — `fillOpacity: 0`이라 지도를 가리지 않는다.
 * gy는 이미지 좌표계(위 0)이고 Leaflet은 남→북이므로 center를 `[1 - gy, gx]`로 뒤집는다.
 * zone이 있으면 원 안의 명당만 남긴다. MapCanvas children으로 렌더링해야 Leaflet 컨텍스트를 쓴다.
 */
export function MyungdangMarkers({ points, visibleTiers, zone }: MyungdangMarkersProps) {
  return (
    <>
      {points
        .filter((p) => visibleTiers[p.tier] && (!zone || insideZone(p, zone)))
        .map((p, i) => (
          <CircleMarker
            key={`${p.gx}-${p.gy}-${i}`}
            center={[1 - p.gy, p.gx]}
            radius={TIER_RADIUS[p.tier]}
            pathOptions={{
              color: TIER_COLOR[p.tier],
              weight: 2,
              fillOpacity: 0,
            }}
          >
            <Tooltip>
              {p.tier} · {p.count}회
            </Tooltip>
          </CircleMarker>
        ))}
    </>
  );
}
