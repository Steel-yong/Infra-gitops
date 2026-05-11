// CircleOverlay 컴포넌트 테스트 — react-leaflet mock 사용
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircleOverlay } from '../components/CircleOverlay';

vi.mock('react-leaflet', () => ({
  Circle: ({ center, radius }: { center: [number, number]; radius: number }) => (
    <div
      data-testid="circle"
      data-center-lat={center[0]}
      data-center-lng={center[1]}
      data-radius={radius}
    />
  ),
}));

describe('CircleOverlay', () => {
  it('circleData가 null이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<CircleOverlay circleData={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('circleData 수신 시 Circle이 렌더링된다', () => {
    render(<CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.2 }} />);
    expect(screen.getByTestId('circle')).toBeInTheDocument();
  });

  it('center는 [y, x] 순서로 전달된다 (Leaflet lat/lng)', () => {
    render(<CircleOverlay circleData={{ x: 0.3, y: 0.7, r: 0.1 }} />);
    const circle = screen.getByTestId('circle');
    expect(circle).toHaveAttribute('data-center-lat', '0.7');
    expect(circle).toHaveAttribute('data-center-lng', '0.3');
  });

  it('radius가 CircleData.r 값으로 전달된다', () => {
    render(<CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.25 }} />);
    expect(screen.getByTestId('circle')).toHaveAttribute('data-radius', '0.25');
  });

  it('circleData 변경 시 새 원으로 교체된다', () => {
    const { rerender } = render(<CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.2 }} />);
    rerender(<CircleOverlay circleData={{ x: 0.8, y: 0.2, r: 0.1 }} />);
    const circle = screen.getByTestId('circle');
    expect(circle).toHaveAttribute('data-center-lat', '0.2');
    expect(circle).toHaveAttribute('data-center-lng', '0.8');
    expect(circle).toHaveAttribute('data-radius', '0.1');
  });

  it('circleData가 null로 변경되면 원이 사라진다', () => {
    const { rerender, container } = render(
      <CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.2 }} />,
    );
    rerender(<CircleOverlay circleData={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
