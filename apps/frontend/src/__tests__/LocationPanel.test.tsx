// LocationPanel 컴포넌트 테스트
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationPanel } from '../components/LocationPanel';
import type { CircleData, LocationData } from '@pubg-helper/shared';

const circle: CircleData = { x: 0.5, y: 0.5, r: 0.2 };

const makeLocation = (overrides: Partial<LocationData> = {}): LocationData => ({
  id: '1',
  coordX: 0.5,
  coordY: 0.5,
  tier: 'S',
  proTeamNames: ['팀A'],
  usageCount: 10,
  mapType: 'erangel',
  ...overrides,
});

describe('LocationPanel', () => {
  it('circleData가 null이면 렌더링하지 않는다', () => {
    const { container } = render(
      <LocationPanel locations={[]} circleData={null} error={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('빈 배열이면 "추천 위치 없음"을 표시한다', () => {
    render(<LocationPanel locations={[]} circleData={circle} error={null} />);
    expect(screen.getByText('추천 위치 없음')).toBeInTheDocument();
  });

  it('locations가 있으면 팀명이 표시된다', () => {
    render(
      <LocationPanel
        locations={[makeLocation({ proTeamNames: ['젠지'] })]}
        circleData={circle}
        error={null}
      />,
    );
    expect(screen.getByText('젠지')).toBeInTheDocument();
  });

  it('error가 있으면 에러 메시지를 표시한다', () => {
    render(<LocationPanel locations={[]} circleData={circle} error="HTTP 500" />);
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500');
  });

  it('거리 오름차순으로 정렬된다', () => {
    const locations = [
      makeLocation({ id: '1', coordX: 0.9, coordY: 0.9, proTeamNames: ['멀리팀'] }),
      makeLocation({ id: '2', coordX: 0.51, coordY: 0.51, proTeamNames: ['가까운팀'] }),
    ];
    render(<LocationPanel locations={locations} circleData={circle} error={null} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('가까운팀');
    expect(items[1]).toHaveTextContent('멀리팀');
  });

  it('등급(S/A/B)이 표시된다', () => {
    const locations = [
      makeLocation({ id: '1', tier: 'S', proTeamNames: ['팀S'] }),
      makeLocation({ id: '2', tier: 'A', proTeamNames: ['팀A'], coordX: 0.6 }),
    ];
    render(<LocationPanel locations={locations} circleData={circle} error={null} />);
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
