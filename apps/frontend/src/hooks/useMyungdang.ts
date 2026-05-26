'use client';
// 맵별 명당(프로 위치) 정적 JSON을 public/data에서 로드하는 훅 — 백엔드/DB 불필요

import { useEffect, useState } from 'react';
import type { MapType } from '@pubg-helper/shared';

export type MyungdangTier = 'S' | 'A' | 'B' | 'C';

export interface MyungdangPoint {
  /** 게임 좌표 x (0~1, 좌→우) */
  gx: number;
  /** 게임 좌표 y (0~1, 이미지 좌표계 위→아래) */
  gy: number;
  /** 조건부(P+Wilson) 등급 */
  tier: MyungdangTier;
  /** 검출 횟수 (병합 합계) */
  count: number;
}

/** S=빨강 / A=주황 / B=노랑 / C=하늘 (회색은 지도에서 안 보여 하늘색). leaflet 비의존. */
export const TIER_COLOR: Record<MyungdangTier, string> = {
  S: '#ff3b3b',
  A: '#ea580c',
  B: '#ffe600',
  C: '#4db8ff',
};

interface MyungdangFile {
  points: MyungdangPoint[];
}

/**
 * `public/data/myungdang-{mapType}.json`을 로드한다.
 * 데이터가 없는 맵(예: 태이고)이나 로드 실패 시 빈 배열을 반환한다.
 */
export function useMyungdang(mapType: MapType): MyungdangPoint[] {
  const [points, setPoints] = useState<MyungdangPoint[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/data/myungdang-${mapType}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: MyungdangFile) => {
        if (!cancelled) setPoints(data.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });

    return () => {
      cancelled = true;
    };
  }, [mapType]);

  return points;
}
