// 프로 추천 위치 데이터 타입

import type { MapType } from './map';

export type LocationTier = 'S' | 'A' | 'B';

export interface LocationData {
  id: string;
  coordX: number;
  coordY: number;
  tier: LocationTier;
  proTeamNames: string[];
  usageCount: number;
  mapType: MapType;
}
