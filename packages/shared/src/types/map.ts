// v1 지원 맵 타입 (에란겔 + 태이고)

/** v1 지원 맵. 에란겔·태이고 검증 후 미라마·론도로 확장 예정. */
export type MapType = 'erangel' | 'taego';

export const MAP_TYPES: readonly MapType[] = ['erangel', 'taego'] as const;

export function isMapType(value: string): value is MapType {
  return MAP_TYPES.includes(value as MapType);
}
