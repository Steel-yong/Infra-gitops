// MyungdangPanel 테스트 — 자기장 유무에 따른 안내/추천 목록
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('자기장 + ranked면 등급순 추천 목록을 표시한다 (중심거리 표시 없음)', () => {
    render(
      <MyungdangPanel
        zoneActive={true}
        ranked={[
          { tier: 'S', key: 'a' },
          { tier: 'A', key: 'b' },
          { tier: 'B', key: 'c' },
        ]}
      />,
    );
    expect(screen.getByText(/추천 명당/)).toBeInTheDocument();
    expect(document.querySelectorAll('li[data-tier]')).toHaveLength(3);
    expect(screen.queryByText(/중심거리/)).not.toBeInTheDocument();
  });

  it('목록 항목 hover 시 onHover(key)가 호출된다', () => {
    const onHover = vi.fn();
    render(<MyungdangPanel zoneActive={true} ranked={[{ tier: 'S', key: 'k1' }]} onHover={onHover} />);
    const li = document.querySelector('li[data-tier]') as HTMLElement;
    fireEvent.mouseEnter(li);
    expect(onHover).toHaveBeenCalledWith('k1');
    fireEvent.mouseLeave(li);
    expect(onHover).toHaveBeenCalledWith(null);
  });
});
