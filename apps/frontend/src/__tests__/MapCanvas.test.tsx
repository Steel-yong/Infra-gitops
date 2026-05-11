// MapCanvas 컴포넌트 테스트 — react-leaflet/leaflet mock 사용
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import MapCanvas from '../components/MapCanvas';

vi.mock('leaflet/dist/leaflet.css', () => ({}));

const mockFitBounds = vi.fn();
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  ImageOverlay: ({ url }: { url: string }) => (
    <div data-testid="image-overlay" data-url={url} />
  ),
  useMap: vi.fn(() => ({ fitBounds: mockFitBounds })),
}));

vi.mock('leaflet', () => ({
  CRS: { Simple: 'CRS.Simple' },
}));

describe('MapCanvas', () => {
  beforeEach(() => {
    mockFitBounds.mockClear();
  });

  it('맵 컨테이너가 렌더링된다', () => {
    render(<MapCanvas mapType="erangel" />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('에란겔 선택 시 에란겔 이미지 URL이 사용된다', () => {
    render(<MapCanvas mapType="erangel" />);
    expect(screen.getByTestId('image-overlay')).toHaveAttribute('data-url', '/maps/erangel.jpg');
  });

  it('태이고 선택 시 태이고 이미지 URL이 사용된다', () => {
    render(<MapCanvas mapType="taego" />);
    expect(screen.getByTestId('image-overlay')).toHaveAttribute('data-url', '/maps/taego.jpg');
  });

  it('마운트 시 fitBounds가 호출된다', () => {
    render(<MapCanvas mapType="erangel" />);
    expect(mockFitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]]);
  });

  it('맵 타입 변경 시 fitBounds가 재호출된다', () => {
    const { rerender } = render(<MapCanvas mapType="erangel" />);
    mockFitBounds.mockClear();
    act(() => {
      rerender(<MapCanvas mapType="taego" />);
    });
    expect(mockFitBounds).toHaveBeenCalledWith([[0, 0], [1, 1]]);
  });

  it('children이 MapContainer 안에 렌더링된다', () => {
    render(
      <MapCanvas mapType="erangel">
        <div data-testid="child-component" />
      </MapCanvas>,
    );
    expect(screen.getByTestId('child-component')).toBeInTheDocument();
  });
});
