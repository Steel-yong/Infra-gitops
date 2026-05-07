// 홈 페이지 렌더링 테스트
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Page from '../app/page';

describe('Page', () => {
  it('"PUBG Helper" 텍스트가 렌더링된다', () => {
    render(<Page />);
    expect(screen.getByText('PUBG Helper')).toBeInTheDocument();
  });
});
