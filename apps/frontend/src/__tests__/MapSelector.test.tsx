// MapSelector 컴포넌트 테스트
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapSelector } from '../components/MapSelector';

describe('MapSelector', () => {
  it('에란겔/태이고 버튼 2개가 렌더링된다', () => {
    render(<MapSelector mapType="erangel" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '에란겔' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '태이고' })).toBeInTheDocument();
  });

  it('첫 진입 시 에란겔 버튼이 active 상태다', () => {
    render(<MapSelector mapType="erangel" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '에란겔' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '태이고' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('태이고 선택 시 태이고 버튼이 active 상태다', () => {
    render(<MapSelector mapType="taego" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '태이고' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '에란겔' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('태이고 버튼 클릭 시 onChange("taego")가 호출된다', () => {
    const onChange = vi.fn();
    render(<MapSelector mapType="erangel" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '태이고' }));
    expect(onChange).toHaveBeenCalledWith('taego');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('에란겔 버튼 클릭 시 onChange("erangel")가 호출된다', () => {
    const onChange = vi.fn();
    render(<MapSelector mapType="taego" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '에란겔' }));
    expect(onChange).toHaveBeenCalledWith('erangel');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('맵 선택 그룹 role이 group이고 aria-label이 있다', () => {
    render(<MapSelector mapType="erangel" onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: '맵 선택' })).toBeInTheDocument();
  });
});
