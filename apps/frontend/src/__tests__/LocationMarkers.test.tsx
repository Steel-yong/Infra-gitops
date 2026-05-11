// LocationMarkers 컴포넌트 테스트 — react-leaflet mock 사용
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocationMarkers } from '../components/LocationMarkers';
import type { LocationData } from '@pubg-helper/shared';

vi.mock('react-leaflet', () => ({
  CircleMarker: ({
    center,
    pathOptions,
    children,
  }: {
    center: [number, number];
    pathOptions: { color: string };
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="circle-marker"
      data-lat={center[0]}
      data-lng={center[1]}
      data-color={pathOptions.color}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
}));

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

describe('LocationMarkers', () => {
  it('빈 배열이면 마커가 렌더링되지 않는다', () => {
    const { container } = render(<LocationMarkers locations={[]} />);
    expect(container.querySelectorAll('[data-testid="circle-marker"]')).toHaveLength(0);
  });

  it('locations 수만큼 마커가 렌더링된다', () => {
    const locations = [makeLocation({ id: '1' }), makeLocation({ id: '2', tier: 'A' })];
    render(<LocationMarkers locations={locations} />);
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2);
  });

  it('S 등급 마커 색상은 금색(#FFD700)이다', () => {
    render(<LocationMarkers locations={[makeLocation({ tier: 'S' })]} />);
    expect(screen.getByTestId('circle-marker')).toHaveAttribute('data-color', '#FFD700');
  });

  it('A 등급 마커 색상은 은색(#C0C0C0)이다', () => {
    render(<LocationMarkers locations={[makeLocation({ tier: 'A' })]} />);
    expect(screen.getByTestId('circle-marker')).toHaveAttribute('data-color', '#C0C0C0');
  });

  it('B 등급 마커 색상은 동색(#CD7F32)이다', () => {
    render(<LocationMarkers locations={[makeLocation({ tier: 'B' })]} />);
    expect(screen.getByTestId('circle-marker')).toHaveAttribute('data-color', '#CD7F32');
  });

  it('마커 center는 [coordY, coordX] 순서다', () => {
    render(<LocationMarkers locations={[makeLocation({ coordX: 0.3, coordY: 0.7 })]} />);
    const marker = screen.getByTestId('circle-marker');
    expect(marker).toHaveAttribute('data-lat', '0.7');
    expect(marker).toHaveAttribute('data-lng', '0.3');
  });

  it('툴팁에 팀명과 등급이 표시된다', () => {
    render(<LocationMarkers locations={[makeLocation({ proTeamNames: ['젠지'], tier: 'S' })]} />);
    expect(screen.getByTestId('tooltip')).toHaveTextContent('젠지 (S)');
  });
});
