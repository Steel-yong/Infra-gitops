// StashMarkers 컴포넌트 테스트 — 비밀창고 마커 렌더링 + Leaflet Y축 뒤집기 검증
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StashMarkers } from '../components/StashMarkers';
import type { LocationData } from '@pubg-helper/shared';

vi.mock('react-leaflet', () => ({
  Marker: ({
    position,
    icon,
    children,
  }: {
    position: [number, number];
    icon: { options?: { html?: string } };
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="stash-marker"
      data-lat={position[0]}
      data-lng={position[1]}
      data-icon-html={icon.options?.html ?? ''}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tooltip">{children}</span>
  ),
}));

vi.mock('leaflet', () => ({
  divIcon: (opts: { html: string; iconSize: [number, number] }) => ({
    options: { html: opts.html, iconSize: opts.iconSize },
  }),
}));

const makeStash = (overrides: Partial<LocationData> = {}): LocationData => ({
  id: 'erangel-stash-01',
  coordX: 0.4,
  coordY: 0.6,
  tier: 'S',
  proTeamNames: ['비밀창고'],
  usageCount: 0,
  mapType: 'erangel',
  ...overrides,
});

describe('StashMarkers', () => {
  it('빈 배열이면 마커가 렌더링되지 않는다', () => {
    const { container } = render(<StashMarkers stashes={[]} />);
    expect(container.querySelectorAll('[data-testid="stash-marker"]')).toHaveLength(0);
  });

  it('stashes 수만큼 마커가 렌더링된다', () => {
    const stashes = [
      makeStash({ id: 'a' }),
      makeStash({ id: 'b' }),
      makeStash({ id: 'c' }),
    ];
    render(<StashMarkers stashes={stashes} />);
    expect(screen.getAllByTestId('stash-marker')).toHaveLength(3);
  });

  it('position은 [1-coordY, coordX] 순서다 (CircleOverlay·MyungdangMarkers와 좌표계 통일)', () => {
    render(<StashMarkers stashes={[makeStash({ coordX: 0.3, coordY: 0.7 })]} />);
    const marker = screen.getByTestId('stash-marker');
    expect(marker).toHaveAttribute('data-lat', String(1 - 0.7));
    expect(marker).toHaveAttribute('data-lng', '0.3');
  });

  it('각 마커에 stash-marker className의 divIcon이 적용된다', () => {
    render(<StashMarkers stashes={[makeStash()]} />);
    expect(screen.getByTestId('stash-marker')).toHaveAttribute(
      'data-icon-html',
      '<div class="stash-marker"></div>',
    );
  });

  it('툴팁에 "비밀창고" 라벨이 표시된다', () => {
    render(<StashMarkers stashes={[makeStash()]} />);
    expect(screen.getByTestId('tooltip')).toHaveTextContent('비밀창고');
  });
});
