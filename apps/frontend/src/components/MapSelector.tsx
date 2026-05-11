// 에란겔/태이고 맵 선택 버튼 UI 컴포넌트
import type { MapType } from '@pubg-helper/shared';
import { MAP_TYPES } from '@pubg-helper/shared';

const MAP_LABELS: Record<MapType, string> = {
  erangel: '에란겔',
  taego: '태이고',
};

interface MapSelectorProps {
  mapType: MapType;
  onChange: (map: MapType) => void;
}

/**
 * 에란겔/태이고 맵 선택 버튼 그룹.
 * 선택된 맵은 aria-pressed="true"로 표시된다.
 */
export function MapSelector({ mapType, onChange }: MapSelectorProps) {
  return (
    <div role="group" aria-label="맵 선택">
      {MAP_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          aria-pressed={mapType === type}
          data-active={mapType === type}
        >
          {MAP_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
