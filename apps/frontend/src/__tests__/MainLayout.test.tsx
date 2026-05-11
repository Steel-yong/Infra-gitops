// MainLayout 컴포넌트 테스트
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from '../components/MainLayout';

describe('MainLayout', () => {
  it('map 슬롯 콘텐츠가 렌더링된다', () => {
    render(<MainLayout map={<div data-testid="map" />} panel={<div />} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('panel 슬롯 콘텐츠가 렌더링된다', () => {
    render(<MainLayout map={<div />} panel={<div data-testid="panel" />} />);
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });

  it('main-layout data-testid가 있다', () => {
    render(<MainLayout map={<div />} panel={<div />} />);
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });
});
