// 프로 추천 위치 목록을 자기장 중심 거리순으로 표시하는 사이드패널 컴포넌트
import type { CircleData, LocationData, LocationTier } from '@pubg-helper/shared';
import styles from './LocationPanel.module.css';

const TIER_LABELS: Record<LocationTier, string> = {
  S: 'S',
  A: 'A',
  B: 'B',
};

function calcDistance(loc: LocationData, circle: CircleData): number {
  return Math.sqrt((loc.coordX - circle.x) ** 2 + (loc.coordY - circle.y) ** 2);
}

interface LocationPanelProps {
  locations: LocationData[];
  circleData: CircleData | null;
  error: string | null;
}

/** circleData가 null이면 패널 자체를 숨긴다. */
export function LocationPanel({ locations, circleData, error }: LocationPanelProps) {
  if (!circleData) return null;

  const sorted = [...locations].sort(
    (a, b) => calcDistance(a, circleData) - calcDistance(b, circleData),
  );

  return (
    <aside className={styles.panel} aria-label="추천 위치 목록">
      <h2 className={styles.title}>추천 위치</h2>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {sorted.length === 0 && !error && <p className={styles.empty}>추천 위치 없음</p>}
      <ul className={styles.list}>
        {sorted.map((loc) => (
          <li key={loc.id} className={styles.item} data-tier={loc.tier}>
            <span className={styles.tier}>{TIER_LABELS[loc.tier]}</span>
            <span className={styles.team}>{loc.proTeamNames[0]}</span>
            <span className={styles.distance}>
              {(calcDistance(loc, circleData) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
