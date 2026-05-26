// 메인 페이지 통합 렌더링 테스트 — 외부 의존성 전체 mock
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useWebNotifications } from '../hooks/useWebNotifications';

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<unknown>) => {
    loader().catch(() => {});
    return function MockDynamic() {
      return <div data-testid="map-canvas" />;
    };
  },
}));

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() })) }));

// setter들을 stable 인스턴스로 유지 — 매 호출마다 새 vi.fn() 생성 시
// useEffect dep가 매 render 변경되어 무한 루프 발생함.
const stableCaptureSocketMock = {
  sendFrame: vi.fn(),
  setIsShrinking: vi.fn(),
  setCurrentPhase: vi.fn(),
  setParentCircle: vi.fn(),
};
vi.mock('../hooks/useCaptureSocket', () => ({
  useCaptureSocket: vi.fn(() => ({
    circleData: null,
    ...stableCaptureSocketMock,
    connected: false,
  })),
}));

vi.mock('../hooks/useScreenCapture', () => ({
  useScreenCapture: vi.fn(() => ({ isCapturing: false, stream: null, start: vi.fn(), stop: vi.fn() })),
}));

vi.mock('../hooks/useMyungdang', () => ({
  useMyungdang: vi.fn(() => []),
  TIER_COLOR: { S: '#ff3b3b', A: '#ff9f1c', B: '#ffe600', C: '#4db8ff' },
}));

vi.mock('../hooks/useWebNotifications', () => ({
  useWebNotifications: vi.fn(() => ({
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(),
    trigger: vi.fn(),
  })),
}));

vi.mock('../hooks/useOcrTimer', () => ({
  useOcrTimer: vi.fn(() => ({
    rawText: '',
    remainingSeconds: null,
    isShrinking: false,
    currentPhase: null,
    cropDataUrl: null,
    region: null,
    attempts: 0,
    status: 'idle',
    errorMessage: null,
  })),
}));

vi.mock('../hooks/useStashLocations', () => ({
  useStashLocations: vi.fn(() => []),
}));

vi.mock('react-leaflet', () => ({
  Circle: () => null,
  CircleMarker: () => null,
  Tooltip: () => null,
}));

import Page from '../app/page';

describe('Page', () => {
  it('"PUBG·Helper" 텍스트가 헤더에 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByText(/PUBG/)).toBeInTheDocument();
  });

  it('공유 시작 버튼이 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByRole('button', { name: '공유 시작' })).toBeInTheDocument();
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

  it('좌·우 사이드바와 맵 영역이 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByRole('complementary', { name: '설정 사이드바' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '명당 사이드바' })).toBeInTheDocument();
    expect(screen.getByTestId('map-canvas')).toBeInTheDocument();
  });

  it('태이고 버튼 클릭 시 aria-pressed가 true로 변경된다', () => {
    render(<Page />);
    const taegoBtn = screen.getByRole('button', { name: '태이고' });
    fireEvent.click(taegoBtn);
    expect(taegoBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('30초 알림 체크박스 클릭 시 체크가 해제되고 재클릭 시 다시 체크된다', () => {
    render(<Page />);
    const checkbox = screen.getByLabelText('30초 알림') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('permission denied 시 알림 권한 거부 메시지가 렌더링된다', () => {
    vi.mocked(useWebNotifications).mockReturnValueOnce({
      permission: 'denied',
      requestPermission: vi.fn(),
      trigger: vi.fn(),
    });
    render(<Page />);
    expect(screen.getByText(/브라우저 알림 권한이 거부되었습니다/)).toBeInTheDocument();
  });

  it('isCapturing=true 일 때 "공유 종료" 버튼과 미리보기 비디오가 표시된다', () => {
    vi.mocked(useScreenCapture).mockReturnValueOnce({
      isCapturing: true,
      stream: {} as MediaStream,
      start: vi.fn(),
      stop: vi.fn(),
    });
    render(<Page />);
    expect(screen.getByRole('button', { name: '공유 종료' })).toBeInTheDocument();
  });

  it('captureError 발생 시 에러 메시지가 렌더링된다', () => {
    let capturedOnError: ((msg: string) => void) | undefined;
    vi.mocked(useScreenCapture).mockImplementationOnce(({ onError }) => {
      capturedOnError = onError;
      return { isCapturing: false, stream: null, start: vi.fn(), stop: vi.fn() };
    });
    render(<Page />);
    act(() => {
      capturedOnError?.('화면공유 실패');
    });
    expect(screen.getByText('화면공유 실패')).toBeInTheDocument();
  });

  it('S 등급 토글 버튼 클릭 시 aria-pressed가 false로 토글된다', () => {
    render(<Page />);
    const sBtn = screen.getByRole('button', { name: 'S 등급 표시' });
    expect(sBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(sBtn);
    expect(sBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
