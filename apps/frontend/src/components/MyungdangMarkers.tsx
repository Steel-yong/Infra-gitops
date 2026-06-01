'use client';
// 명당(프로 위치)을 등급별 도넛 마커로 Leaflet 지도에 렌더링하는 컴포넌트

import { Fragment, useState } from 'react';
import { CircleMarker, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { CircleData } from '@pubg-helper/shared';
import { TIER_COLOR, type MyungdangPoint, type MyungdangTier } from '../hooks/useMyungdang';

/** 4~5확대(줌 델타 GROW_ZOOM)에서 도달할 목표 도넛 반경. 최소줌에선 점(DOT_RADIUS)에서 시작해 여기까지 커진다. */
const TIER_TARGET: Record<MyungdangTier, number> = { S: 6, A: 6, B: 5, C: 1.3 };
/** 최소줌(전체맵)에서의 점 크기. */
const DOT_RADIUS = 1.5;
/** 이 줌 델타(최소줌 기준)에서 목표 크기 도달. */
const GROW_ZOOM = 5;

/** hover 시 가리키는 빨간 화살표 — 점 위에서 ▼ 끝이 점을 가리킴. */
const arrowIcon = divIcon({
  className: '',
  html: '<div style="color:#ff2d2d;font-size:24px;line-height:1;text-shadow:0 0 4px #000,0 0 2px #000">▼</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 30],
});

interface MyungdangMarkersProps {
  points: MyungdangPoint[];
  /** 등급별 표시 여부. false면 해당 등급 숨김. */
  visibleTiers: Record<MyungdangTier, boolean>;
  /** 자기장 원. 있으면 원 안의 명당만 표시(다른 지역은 숨김). null이면 전체. */
  zone?: CircleData | null;
  /** 우측 패널에 뜬(자기장 중심에 가까운) 명당 키 집합 — 흰 테두리 링으로 강조. */
  highlightedKeys?: Set<string>;
  /** 우측 패널 항목에 hover 중인 명당 키 — 그 마커에 시안 테두리를 하나 더 씌운다. */
  hoveredKey?: string | null;
}

/** 마커 고유 키 (좌표 기반) — page의 하이라이트 집합과 매칭. */
export function pointKey(p: { gx: number; gy: number }): string {
  return `${p.gx}-${p.gy}`;
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
export function MyungdangMarkers({ points, visibleTiers, zone, highlightedKeys, hoveredKey }: MyungdangMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(() => map.getZoom());
  useMapEvents({ zoom: () => setZoom(map.getZoom()) });
  // 최소줌=0, GROW_ZOOM 델타에서 1. 점(DOT)에서 목표 반경까지 선형 보간. C(파랑)는 항상 점.
  const t = Math.min(Math.max((zoom - map.getMinZoom()) / GROW_ZOOM, 0), 1);
  const radiusOf = (tier: MyungdangTier): number =>
    tier === 'C' ? TIER_TARGET.C : DOT_RADIUS + (TIER_TARGET[tier] - DOT_RADIUS) * t;
  return (
    <>
      {points
        .filter((p) => visibleTiers[p.tier] && (!zone || insideZone(p, zone)))
        .map((p, i) => {
          const key = pointKey(p);
          const highlighted = highlightedKeys?.has(key) ?? false;
          const hovered = hoveredKey != null && hoveredKey === key;
          return (
            <Fragment key={`${p.gx}-${p.gy}-${i}`}>
              {hovered && (
                <>
                  <CircleMarker
                    center={[1 - p.gy, p.gx]}
                    radius={radiusOf(p.tier) + 7}
                    pathOptions={{ color: '#22d3ee', weight: 3, fillOpacity: 0 }}
                  />
                  <Marker position={[1 - p.gy, p.gx]} icon={arrowIcon} />
                </>
              )}
              {highlighted && (
                <CircleMarker
                  center={[1 - p.gy, p.gx]}
                  radius={radiusOf(p.tier) + 4}
                  pathOptions={{ color: '#ffffff', weight: 2, fillOpacity: 0 }}
                />
              )}
              <CircleMarker
                center={[1 - p.gy, p.gx]}
                radius={radiusOf(p.tier)}
                pathOptions={{
                  color: TIER_COLOR[p.tier],
                  weight: highlighted ? 3 : 2,
                  fillColor: TIER_COLOR[p.tier],
                  fillOpacity: p.tier === 'C' ? 1 : 0,
                }}
              >
                <Tooltip>{p.tier}</Tooltip>
              </CircleMarker>
            </Fragment>
          );
        })}
    </>
  );
}
