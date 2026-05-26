// MyungdangPanel 테스트 — 자기장 유무에 따른 안내/추천 목록
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyungdangPanel } from '../components/MyungdangPanel';

describe('MyungdangPanel', () => {
  it('자기장 없으면 안내 문구를 표시한다 (등급 개수 없음)', () => {
    render(<MyungdangPanel zoneActive={false} />);
    expect(screen.getByText(/자기장이 감지되면 추천/)).toBeInTheDocument();
  });

  it('자기장 있지만 원 안 명당이 없으면 빈 안내를 표시한다', () => {
    render(<MyungdangPanel zoneActive={true} ranked={[]} />);
    expect(screen.getByText(/추천할 명당이 없습니다/)).toBeInTheDocument();
  });

  it('자기장 + ranked면 중심거리순 추천 목록을 표시한다', () => {
    render(
      <MyungdangPanel
        zoneActive={true}
        ranked={[
          { tier: 'S', distPct: 5 },
          { tier: 'A', distPct: 20 },
        ]}
      />,
    );
    expect(screen.getByText(/가까운 순/)).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
