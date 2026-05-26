// 명당 우측 패널 — 자기장 잡히면 중심거리순 추천 목록, 아니면 등급 범례·개수

import { TIER_COLOR, type MyungdangTier } from '../hooks/useMyungdang';

const TIER_ORDER: MyungdangTier[] = ['S', 'A', 'B', 'C'];

/** 자기장 내부 명당 1개의 순위 표시용 — 중심거리(%) 포함. */
export interface RankedMyungdang {
  tier: MyungdangTier;
  /** 자기장 중심까지 거리 (반경 대비 %, 0=중심). */
  distPct: number;
}

interface MyungdangPanelProps {
  /** 등급별 개수 (자기장 필터 적용 후 보이는 수). */
  counts: Record<MyungdangTier, number>;
  /** 등급별 표시 여부 — 꺼진 등급은 흐리게. */
  visibleTiers: Record<MyungdangTier, boolean>;
  /** 자기장 필터가 걸려 있는지. */
  zoneActive: boolean;
  /** 자기장 잡혔을 때 중심거리순 추천 목록 (마커에 흰 테두리로 강조된 것들). */
  ranked?: RankedMyungdang[];
}

const dot = (tier: MyungdangTier) => ({
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: `2px solid ${TIER_COLOR[tier]}`,
  flex: '0 0 auto' as const,
});

/**
 * 자기장이 잡히고 추천 목록이 있으면 "중심에서 가까운 순" 리스트(이름 없으니 거리 기준)를 보여준다.
 * 그 외에는 등급 범례·개수. 꺼진 등급은 흐리게.
 */
export function MyungdangPanel({ counts, visibleTiers, zoneActive, ranked }: MyungdangPanelProps) {
  if (zoneActive && ranked && ranked.length > 0) {
    return (
      <div aria-label="자기장 내부 추천 명당">
        <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: '0 0 10px' }}>
          자기장 중심에서 가까운 순 · {ranked.length}곳
        </p>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranked.map((r, i) => (
            <li
              key={i}
              data-tier={r.tier}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ width: 18, color: '#8b949e', fontWeight: 700 }}>{i + 1}</span>
              <span aria-hidden style={dot(r.tier)} />
              <span style={{ fontWeight: 700, width: 16 }}>{r.tier}</span>
              <span style={{ color: '#8b949e', fontSize: '0.8rem', flex: 1 }}>중심거리</span>
              <span style={{ fontWeight: 600 }}>{r.distPct}%</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

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
            style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: visibleTiers[tier] ? 1 : 0.35 }}
          >
            <span aria-hidden style={dot(tier)} />
            <span style={{ fontWeight: 700, flex: 1 }}>{tier}</span>
            <span style={{ fontWeight: 600 }}>{counts[tier]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
