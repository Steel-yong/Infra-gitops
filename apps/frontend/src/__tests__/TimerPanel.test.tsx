// TimerPanel 컴포넌트 단위 테스트 — 단순화된 디자인 (디버그 박스 없음)
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimerPanel } from '../components/TimerPanel';
import type { OcrTimerState } from '../hooks/useOcrTimer';

function makeState(partial: Partial<OcrTimerState> = {}): OcrTimerState {
  return {
    rawText: '',
    remainingSeconds: null,
    isShrinking: false,
    cropDataUrl: null,
    region: null,
    attempts: 0,
    ...partial,
  };
}

describe('TimerPanel', () => {
  it('isCapturing=false → idle 메시지 표시 + 타이머 미렌더', () => {
    render(<TimerPanel state={makeState()} isCapturing={false} />);
    expect(screen.getByText(/화면공유 시작 후/)).toBeInTheDocument();
    expect(screen.queryByText('다음 자기장까지')).not.toBeInTheDocument();
  });

  it('isCapturing=true + remainingSeconds=null → "--:--" + 회색 색상', () => {
    render(<TimerPanel state={makeState()} isCapturing={true} />);
    const timer = screen.getByText('--:--');
    expect(timer).toBeInTheDocument();
    expect(timer.className).toMatch(/timerNeutral/);
  });

  it('remainingSeconds=98 → "1:38" 표시', () => {
    render(
      <TimerPanel state={makeState({ remainingSeconds: 98 })} isCapturing={true} />,
    );
    expect(screen.getByText('1:38')).toBeInTheDocument();
  });

  it('remainingSeconds=20 → 빨강(danger) 색상 클래스', () => {
    render(
      <TimerPanel state={makeState({ remainingSeconds: 20 })} isCapturing={true} />,
    );
    expect(screen.getByText('0:20').className).toMatch(/timerDanger/);
  });

  it('remainingSeconds=50 → 주황(warning) 색상 클래스', () => {
    render(
      <TimerPanel state={makeState({ remainingSeconds: 50 })} isCapturing={true} />,
    );
    expect(screen.getByText('0:50').className).toMatch(/timerWarning/);
  });

  it('remainingSeconds=120 → 노랑(normal) 색상 클래스', () => {
    render(
      <TimerPanel state={makeState({ remainingSeconds: 120 })} isCapturing={true} />,
    );
    expect(screen.getByText('2:00').className).toMatch(/timerNormal/);
  });

  it('isShrinking=true → "줄어드는 중" 배지', () => {
    render(
      <TimerPanel state={makeState({ isShrinking: true })} isCapturing={true} />,
    );
    expect(screen.getByText(/줄어드는 중/)).toBeInTheDocument();
    expect(screen.queryByText(/대기 중/)).not.toBeInTheDocument();
  });

  it('isShrinking=false → "대기 중" 배지', () => {
    render(
      <TimerPanel state={makeState({ isShrinking: false })} isCapturing={true} />,
    );
    expect(screen.getByText(/대기 중/)).toBeInTheDocument();
    expect(screen.queryByText(/줄어드는 중/)).not.toBeInTheDocument();
  });

  it('디버그 박스(OCR 인식, 크롭 영역, 시도 횟수, 크롭 이미지) 미표시', () => {
    render(
      <TimerPanel
        state={makeState({
          rawText: '1:38',
          remainingSeconds: 98,
          cropDataUrl: 'data:image/png;base64,XXX',
          region: { x: 1680, y: 820, w: 180, h: 35 },
          attempts: 42,
        })}
        isCapturing={true}
      />,
    );
    expect(screen.queryByText(/OCR 인식/)).not.toBeInTheDocument();
    expect(screen.queryByText(/크롭 영역/)).not.toBeInTheDocument();
    expect(screen.queryByText(/시도 횟수/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('"신규" 배지 미표시', () => {
    render(<TimerPanel state={makeState()} isCapturing={true} />);
    expect(screen.queryByText(/신규/)).not.toBeInTheDocument();
  });
});
