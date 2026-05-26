// MyungdangPanel 테스트 — 등급별 개수·합계·자기장 라벨·꺼진 등급 흐리게
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyungdangPanel } from '../components/MyungdangPanel';

const counts = { S: 14, A: 43, B: 109, C: 571 };
const ALL = { S: true, A: true, B: true, C: true };

describe('MyungdangPanel', () => {
  it('등급별 개수를 표시한다', () => {
    render(<MyungdangPanel counts={counts} visibleTiers={ALL} zoneActive={false} />);
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('571')).toBeInTheDocument();
  });

  it('zone 없으면 "전체 명당 · 737곳"을 표시한다', () => {
    render(<MyungdangPanel counts={counts} visibleTiers={ALL} zoneActive={false} />);
    expect(screen.getByText(/전체 명당/)).toBeInTheDocument();
    expect(screen.getByText(/737곳/)).toBeInTheDocument();
  });

  it('zoneActive면 "자기장 내부 명당" 라벨을 표시한다', () => {
    render(<MyungdangPanel counts={counts} visibleTiers={ALL} zoneActive={true} />);
    expect(screen.getByText(/자기장 내부 명당/)).toBeInTheDocument();
  });

  it('꺼진 등급은 흐리게(opacity 0.35) 표시한다', () => {
    render(<MyungdangPanel counts={counts} visibleTiers={{ ...ALL, C: false }} zoneActive={false} />);
    const cItem = document.querySelector('[data-tier="C"]') as HTMLElement;
    expect(cItem.style.opacity).toBe('0.35');
  });
});
