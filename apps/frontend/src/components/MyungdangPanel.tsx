// 명당 추천 패널 — 자기장 잡히면 중심거리순 추천 목록, 없으면 짧은 안내만

import { TIER_COLOR, type MyungdangTier } from '../hooks/useMyungdang';

/** 자기장 내부 추천 명당 1개 — 등급순+중심거리순으로 page에서 정렬된 결과. */
export interface RankedMyungdang {
  tier: MyungdangTier;
  /** 마커 키 (gx-gy) — 목록 hover 시 지도 마커 매칭용. */
  key: string;
}

interface MyungdangPanelProps {
  /** 자기장이 잡혀 있는지. */
  zoneActive: boolean;
  /** 자기장 중심거리순 추천 목록 (마커에 흰 테두리로 강조된 것들). */
  ranked?: RankedMyungdang[];
  /** 목록 항목 hover 시 해당 명당 키를 알린다 (지도에서 시안 테두리로 추가 강조). */
  onHover?: (key: string | null) => void;
}

const hintStyle = { fontSize: '0.8rem', color: '#8b949e', lineHeight: 1.6, margin: 0 } as const;

const dot = (tier: MyungdangTier) => ({
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: `2px solid ${TIER_COLOR[tier]}`,
  flex: '0 0 auto' as const,
});

/**
 * 자기장이 잡히고 추천 목록이 있으면 "중심에서 가까운 순" 리스트(이름 없으니 거리 기준)를 보여준다.
 * 자기장이 없거나 원 안 명당이 없으면 안내 문구만 (등급 개수 표시는 두지 않는다).
 */
export function MyungdangPanel({ zoneActive, ranked, onHover }: MyungdangPanelProps) {
  if (!zoneActive) {
    return <p style={hintStyle}>화면공유로 자기장이 감지되면 추천이 표시됩니다.</p>;
  }
  if (!ranked || ranked.length === 0) {
    return <p style={hintStyle}>이 자기장 안에 추천할 명당이 없습니다.</p>;
  }
  return (
    <div aria-label="자기장 내부 추천 명당">
      <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: '0 0 10px' }}>
        추천 명당 · {ranked.length}곳 (등급·중심 가까운 순)
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ranked.map((r, i) => (
          <li
            key={i}
            data-tier={r.tier}
            onMouseEnter={() => onHover?.(r.key)}
            onMouseLeave={() => onHover?.(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <span style={{ width: 18, color: '#8b949e', fontWeight: 700 }}>{i + 1}</span>
            <span aria-hidden style={dot(r.tier)} />
            <span style={{ fontWeight: 700 }}>{r.tier}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
