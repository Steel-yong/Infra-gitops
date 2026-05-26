// 명당 등급 범례 + 등급별 개수를 보여주는 우측 패널 (기존 추천 목록 대체)

import { TIER_COLOR, type MyungdangTier } from '../hooks/useMyungdang';

const TIER_ORDER: MyungdangTier[] = ['S', 'A', 'B', 'C'];
const TIER_DESC: Record<MyungdangTier, string> = {
  S: '최상위 명당',
  A: '상위',
  B: '중위',
  C: '하위',
};

interface MyungdangPanelProps {
  /** 등급별 개수 (자기장 필터 적용 후 보이는 수). */
  counts: Record<MyungdangTier, number>;
  /** 등급별 표시 여부 — 꺼진 등급은 흐리게. */
  visibleTiers: Record<MyungdangTier, boolean>;
  /** 자기장 필터가 걸려 있는지 (true면 "자기장 내부만" 안내). */
  zoneActive: boolean;
}

/** 명당 범례 — 등급 색·설명·개수. 토글 꺼진 등급은 흐리게 표시한다. */
export function MyungdangPanel({ counts, visibleTiers, zoneActive }: MyungdangPanelProps) {
  const total = TIER_ORDER.reduce((sum, t) => sum + counts[t], 0);
  return (
    <div aria-label="명당 범례">
      <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: '0 0 10px' }}>
        {zoneActive ? '자기장 내부 명당' : '전체 명당'} · {total}곳
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TIER_ORDER.map((tier) => (
          <li
            key={tier}
            data-tier={tier}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: visibleTiers[tier] ? 1 : 0.35,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `2px solid ${TIER_COLOR[tier]}`,
                flex: '0 0 auto',
              }}
            />
            <span style={{ fontWeight: 700, width: 16 }}>{tier}</span>
            <span style={{ color: '#8b949e', fontSize: '0.8rem', flex: 1 }}>{TIER_DESC[tier]}</span>
            <span style={{ fontWeight: 600 }}>{counts[tier]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
