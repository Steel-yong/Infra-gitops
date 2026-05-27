// 어드민 컴포넌트 테스트 — 로그인 폼 + 헬스 대시보드(상태 색·수동 확인)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const checkMock = vi.fn();
vi.mock('../hooks/useServiceHealth', () => ({
  useServiceHealth: () => ({
    health: {
      capture: { status: 'ok', code: 200, latencyMs: 12, body: '{"status":"ok"}', checkedAt: Date.now() },
      location: { status: 'error', code: null, latencyMs: null, body: 'ECONNREFUSED', checkedAt: Date.now() },
      alert: { status: 'checking', code: null, latencyMs: null, body: '', checkedAt: null },
    },
    check: checkMock,
  }),
}));

import AdminLoginPage from '../app/admin/login/page';
import AdminPage from '../app/admin/page';

describe('AdminLoginPage', () => {
  beforeEach(() => pushMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('비번 입력·제출 성공 → /admin 으로 이동', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
    render(<AdminLoginPage />);
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/admin'));
  });

  it('제출 실패(401) → 에러 메시지 표시, 이동 안 함', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    render(<AdminLoginPage />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText(/올바르지 않습니다/)).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('AdminPage 헬스 대시보드', () => {
  beforeEach(() => checkMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('3개 서비스 카드가 상태별로 렌더된다', () => {
    render(<AdminPage />);
    expect(screen.getByText('서비스 헬스 대시보드')).toBeInTheDocument();
    expect(screen.getByTestId('card-capture')).toHaveAttribute('data-status', 'ok');
    expect(screen.getByTestId('card-location')).toHaveAttribute('data-status', 'error');
    expect(screen.getByTestId('card-alert')).toHaveAttribute('data-status', 'checking');
  });

  it('상태 라벨(정상/오류/확인중)이 표시된다', () => {
    render(<AdminPage />);
    expect(within(screen.getByTestId('card-capture')).getByText('정상')).toBeInTheDocument();
    expect(within(screen.getByTestId('card-location')).getByText('오류')).toBeInTheDocument();
    expect(within(screen.getByTestId('card-alert')).getByText('확인중')).toBeInTheDocument();
  });

  it('카드의 "지금 확인" 클릭 → 해당 서비스만 check(key)', () => {
    render(<AdminPage />);
    const captureCard = screen.getByTestId('card-capture');
    fireEvent.click(within(captureCard).getByRole('button', { name: '지금 확인' }));
    expect(checkMock).toHaveBeenCalledWith('capture');
  });

  it('checking 상태 카드의 버튼은 비활성', () => {
    render(<AdminPage />);
    const alertBtn = within(screen.getByTestId('card-alert')).getByRole('button');
    expect(alertBtn).toBeDisabled();
  });

  it('"전체 새로고침" → check() 전체 호출', () => {
    render(<AdminPage />);
    fireEvent.click(screen.getByRole('button', { name: '전체 새로고침' }));
    expect(checkMock).toHaveBeenCalledWith();
  });

  it('엔드포인트 직접 호출 → 응답 표시', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, text: async () => '[]' } as Response);
    render(<AdminPage />);
    fireEvent.click(screen.getByRole('button', { name: /location · GET \/locations/ }));
    expect(await screen.findByText(/HTTP 200/)).toBeInTheDocument();
  });
});
