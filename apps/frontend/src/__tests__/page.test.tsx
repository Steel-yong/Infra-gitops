// 메인 페이지 통합 렌더링 테스트 — 외부 의존성 전체 mock
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  default: (_loader: unknown) =>
    function MockDynamic() {
      return <div data-testid="map-canvas" />;
    },
}));

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() })) }));

vi.mock('../hooks/useCaptureSocket', () => ({
  useCaptureSocket: vi.fn(() => ({ circleData: null, sendFrame: vi.fn(), connected: false })),
}));

vi.mock('../hooks/useScreenCapture', () => ({
  useScreenCapture: vi.fn(() => ({ isCapturing: false, start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('../hooks/useLocations', () => ({
  useLocations: vi.fn(() => ({ locations: [], loading: false, error: null })),
}));

vi.mock('../hooks/useWebNotifications', () => ({
  useWebNotifications: vi.fn(() => ({
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(),
    trigger: vi.fn(),
  })),
}));

vi.mock('react-leaflet', () => ({
  Circle: () => null,
  CircleMarker: () => null,
  Tooltip: () => null,
}));

import Page from '../app/page';

describe('Page', () => {
  it('"PUBG Helper" 텍스트가 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByText('PUBG Helper')).toBeInTheDocument();
  });

  it('화면공유 시작 버튼이 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByRole('button', { name: '화면공유 시작' })).toBeInTheDocument();
  });

  it('에란겔/태이고 맵 선택 버튼이 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByRole('button', { name: '에란겔' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '태이고' })).toBeInTheDocument();
  });

  it('알림 설정 체크박스가 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByLabelText('30초 알림')).toBeInTheDocument();
  });

  it('권한 default 상태에서 "알림 권한 허용" 버튼이 보인다', () => {
    render(<Page />);
    expect(screen.getByRole('button', { name: '알림 권한 허용' })).toBeInTheDocument();
  });

  it('MainLayout이 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });
});
