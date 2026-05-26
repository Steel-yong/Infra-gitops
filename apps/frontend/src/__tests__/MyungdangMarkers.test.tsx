// MyungdangMarkers 테스트 — react-leaflet mock으로 도넛·색·크기·등급/자기장 필터 검증
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyungdangMarkers } from '../components/MyungdangMarkers';
import type { MyungdangPoint } from '../hooks/useMyungdang';

vi.mock('react-leaflet', () => ({
  CircleMarker: ({
    center,
    radius,
    pathOptions,
    children,
  }: {
    center: [number, number];
    radius: number;
    pathOptions: { color: string; fillOpacity: number };
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="circle-marker"
      data-lat={center[0]}
      data-lng={center[1]}
      data-radius={radius}
      data-color={pathOptions.color}
      data-fill-opacity={pathOptions.fillOpacity}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
}));

const ALL = { S: true, A: true, B: true, C: true };
const pt = (o: Partial<MyungdangPoint> = {}): MyungdangPoint => ({
  gx: 0.5,
  gy: 0.5,
  tier: 'S',
  count: 10,
  ...o,
});

describe('MyungdangMarkers', () => {
  it('points 수만큼 마커가 렌더링된다', () => {
    render(<MyungdangMarkers points={[pt({ tier: 'S' }), pt({ tier: 'A' })]} visibleTiers={ALL} />);
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(2);
  });

  it('도넛 — fillOpacity가 0이다 (속 빈 링)', () => {
    render(<MyungdangMarkers points={[pt()]} visibleTiers={ALL} />);
    expect(screen.getByTestId('circle-marker')).toHaveAttribute('data-fill-opacity', '0');
  });

  it('S=빨강(#ff3b3b)', () => {
    render(<MyungdangMarkers points={[pt({ tier: 'S' })]} visibleTiers={ALL} />);
    expect(screen.getByTestId('circle-marker')).toHaveAttribute('data-color', '#ff3b3b');
  });

  it('C=하늘(#4db8ff)', () => {
    render(<MyungdangMarkers points={[pt({ tier: 'C' })]} visibleTiers={ALL} />);
    expect(screen.getByTestId('circle-marker')).toHaveAttribute('data-color', '#4db8ff');
  });

  it('크기 최대 = A(주황): S와 A의 반경이 같다', () => {
    const { rerender } = render(<MyungdangMarkers points={[pt({ tier: 'S' })]} visibleTiers={ALL} />);
    const sRadius = screen.getByTestId('circle-marker').getAttribute('data-radius');
    rerender(<MyungdangMarkers points={[pt({ tier: 'A' })]} visibleTiers={ALL} />);
    const aRadius = screen.getByTestId('circle-marker').getAttribute('data-radius');
    expect(sRadius).toBe(aRadius);
  });

  it('visibleTiers로 등급 필터 — C를 끄면 C는 숨겨진다', () => {
    render(
      <MyungdangMarkers
        points={[pt({ tier: 'C' }), pt({ tier: 'S' })]}
        visibleTiers={{ ...ALL, C: false }}
      />,
    );
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(1);
  });

  it('zone이 있으면 원 안의 명당만 표시한다', () => {
    const inside = pt({ gx: 0.5, gy: 0.5 });
    const outside = pt({ gx: 0.95, gy: 0.95 });
    render(
      <MyungdangMarkers
        points={[inside, outside]}
        visibleTiers={ALL}
        zone={{ x: 0.5, y: 0.5, r: 0.1 }}
      />,
    );
    expect(screen.getAllByTestId('circle-marker')).toHaveLength(1);
  });

  it('center는 [1-gy, gx] 순서다 (이미지 좌표계 → Leaflet Y축 뒤집기)', () => {
    render(<MyungdangMarkers points={[pt({ gx: 0.3, gy: 0.7 })]} visibleTiers={ALL} />);
    const marker = screen.getByTestId('circle-marker');
    expect(marker).toHaveAttribute('data-lat', String(1 - 0.7));
    expect(marker).toHaveAttribute('data-lng', '0.3');
  });
});
