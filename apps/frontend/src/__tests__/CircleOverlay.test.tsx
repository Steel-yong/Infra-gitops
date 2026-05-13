// CircleOverlay 컴포넌트 테스트 — react-leaflet SVGOverlay mock 사용
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircleOverlay } from '../components/CircleOverlay';

vi.mock('react-leaflet', () => ({
  SVGOverlay: ({ children, bounds }: { children: React.ReactNode; bounds: unknown }) => (
    <svg data-testid="svg-overlay" data-bounds={JSON.stringify(bounds)}>
      {children}
    </svg>
  ),
}));

describe('CircleOverlay', () => {
  it('circleData가 null이면 아무것도 렌더링하지 않는다', () => {
    const { container } = render(<CircleOverlay circleData={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('circleData 수신 시 SVGOverlay가 렌더링된다', () => {
    render(<CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.2 }} />);
    expect(screen.getByTestId('svg-overlay')).toBeInTheDocument();
  });

  it('원 바깥 영역을 evenodd path로 그린다', () => {
    render(<CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.2 }} />);
    const path = document.querySelector('path');
    expect(path).not.toBeNull();
    // evenodd fill-rule 적용 확인
    expect(path!.getAttribute('fill-rule') ?? path!.getAttribute('fillRule')).toBe('evenodd');
  });

  it('흰색 링(circle 엘리먼트)이 렌더링된다', () => {
    render(<CircleOverlay circleData={{ x: 0.3, y: 0.7, r: 0.15 }} />);
    const circle = document.querySelector('circle');
    expect(circle).not.toBeNull();
    expect(circle!.getAttribute('cx')).toBe('0.3');
    expect(circle!.getAttribute('cy')).toBe('0.7');
    expect(circle!.getAttribute('r')).toBe('0.15');
    expect(circle!.getAttribute('stroke')).toBe('white');
    expect(circle!.getAttribute('fill')).toBe('none');
  });

  it('circleData가 null로 변경되면 원이 사라진다', () => {
    const { rerender, container } = render(
      <CircleOverlay circleData={{ x: 0.5, y: 0.5, r: 0.2 }} />,
    );
    rerender(<CircleOverlay circleData={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
