// PlayerMarker 컴포넌트 테스트 — 위치 [1-y,x] 변환 + heading 회전 + null 처리
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerMarker } from '../components/PlayerMarker';
import type { PlayerPosition } from '@pubg-helper/shared';

vi.mock('react-leaflet', () => ({
  Marker: ({
    position,
    icon,
  }: {
    position: [number, number];
    icon: { options?: { html?: string } };
  }) => (
    <div
      data-testid="player-marker"
      data-lat={position[0]}
      data-lng={position[1]}
      data-icon-html={icon.options?.html ?? ''}
    />
  ),
}));

vi.mock('leaflet', () => ({
  divIcon: (opts: { html: string }) => ({ options: { html: opts.html } }),
}));

describe('PlayerMarker', () => {
  it('player가 null이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<PlayerMarker player={null} />);
    expect(container.querySelectorAll('[data-testid="player-marker"]')).toHaveLength(0);
  });

  it('position은 [1-y, x] 순서다', () => {
    const player: PlayerPosition = { x: 0.3, y: 0.7 };
    render(<PlayerMarker player={player} />);
    const marker = screen.getByTestId('player-marker');
    expect(marker).toHaveAttribute('data-lat', String(1 - 0.7));
    expect(marker).toHaveAttribute('data-lng', '0.3');
  });

  it('heading이 있으면 화살표를 그 각도로 회전한다', () => {
    render(<PlayerMarker player={{ x: 0.5, y: 0.5, heading: 90 }} />);
    const html = screen.getByTestId('player-marker').getAttribute('data-icon-html') ?? '';
    expect(html).toContain('player-arrow');
    expect(html).toContain('rotate(90deg)');
  });

  it('heading이 없으면 회전 없는 점 마커', () => {
    render(<PlayerMarker player={{ x: 0.5, y: 0.5 }} />);
    const html = screen.getByTestId('player-marker').getAttribute('data-icon-html') ?? '';
    expect(html).toContain('player-dot');
    expect(html).not.toContain('rotate');
  });

  it('heading 0(북)도 회전 화살표로 처리(undefined와 구분)', () => {
    render(<PlayerMarker player={{ x: 0.5, y: 0.5, heading: 0 }} />);
    const html = screen.getByTestId('player-marker').getAttribute('data-icon-html') ?? '';
    expect(html).toContain('player-arrow');
    expect(html).toContain('rotate(0deg)');
  });
});
