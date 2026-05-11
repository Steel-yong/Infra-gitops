// ScreenShareButton 컴포넌트 테스트
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreenShareButton } from '../components/ScreenShareButton';

describe('ScreenShareButton', () => {
  it('비캡처 상태에서 "화면공유 시작" 텍스트를 보여준다', () => {
    render(<ScreenShareButton isCapturing={false} onStart={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: '화면공유 시작' })).toBeInTheDocument();
  });

  it('캡처 중에는 "화면공유 중지" 텍스트를 보여준다', () => {
    render(<ScreenShareButton isCapturing={true} onStart={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('button', { name: '화면공유 중지' })).toBeInTheDocument();
  });

  it('비캡처 상태에서 클릭 시 onStart가 호출된다', () => {
    const onStart = vi.fn();
    render(<ScreenShareButton isCapturing={false} onStart={onStart} onStop={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onStart).toHaveBeenCalled();
  });

  it('캡처 중에 클릭 시 onStop이 호출된다', () => {
    const onStop = vi.fn();
    render(<ScreenShareButton isCapturing={true} onStart={vi.fn()} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onStop).toHaveBeenCalled();
  });

  it('isCapturing 값이 aria-pressed에 반영된다', () => {
    const { rerender } = render(
      <ScreenShareButton isCapturing={false} onStart={vi.fn()} onStop={vi.fn()} />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    rerender(<ScreenShareButton isCapturing={true} onStart={vi.fn()} onStop={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
