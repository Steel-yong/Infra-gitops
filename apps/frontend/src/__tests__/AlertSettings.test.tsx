// AlertSettings 컴포넌트 테스트
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertSettings } from '../components/AlertSettings';

describe('AlertSettings', () => {
  it('30/20/10초 체크박스 3개가 렌더링된다', () => {
    render(<AlertSettings enabled={[]} onChange={vi.fn()} permissionDenied={false} />);
    expect(screen.getByLabelText('30초 알림')).toBeInTheDocument();
    expect(screen.getByLabelText('20초 알림')).toBeInTheDocument();
    expect(screen.getByLabelText('10초 알림')).toBeInTheDocument();
  });

  it('enabled에 포함된 임계값 체크박스가 checked 상태다', () => {
    render(<AlertSettings enabled={[30, 10]} onChange={vi.fn()} permissionDenied={false} />);
    expect(screen.getByLabelText('30초 알림')).toBeChecked();
    expect(screen.getByLabelText('20초 알림')).not.toBeChecked();
    expect(screen.getByLabelText('10초 알림')).toBeChecked();
  });

  it('체크박스 선택 시 onChange에 해당 초가 추가된다', () => {
    const onChange = vi.fn();
    render(<AlertSettings enabled={[30]} onChange={onChange} permissionDenied={false} />);
    fireEvent.click(screen.getByLabelText('20초 알림'));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([30, 20]));
  });

  it('체크박스 해제 시 onChange에서 해당 초가 제거된다', () => {
    const onChange = vi.fn();
    render(<AlertSettings enabled={[30, 20]} onChange={onChange} permissionDenied={false} />);
    fireEvent.click(screen.getByLabelText('30초 알림'));
    expect(onChange).toHaveBeenCalledWith([20]);
  });

  it('각 체크박스는 독립적으로 선택 가능하다', () => {
    const onChange = vi.fn();
    render(<AlertSettings enabled={[]} onChange={onChange} permissionDenied={false} />);
    fireEvent.click(screen.getByLabelText('10초 알림'));
    expect(onChange).toHaveBeenCalledWith([10]);
  });

  it('permissionDenied=true이면 경고 배너가 표시된다', () => {
    render(<AlertSettings enabled={[]} onChange={vi.fn()} permissionDenied={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('permissionDenied=false이면 경고 배너가 없다', () => {
    render(<AlertSettings enabled={[]} onChange={vi.fn()} permissionDenied={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
