// 어드민 페이지 컴포넌트 테스트 — 로그인 폼 + API 테스트 패널
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

import AdminLoginPage from '../app/admin/login/page';
import AdminPage from '../app/admin/page';

describe('AdminLoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

describe('AdminPage (API 테스트 패널)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('서비스별 프로브 버튼이 렌더된다', () => {
    render(<AdminPage />);
    expect(screen.getByRole('button', { name: /capture · GET \/health/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /alert · GET \/health/ })).toBeInTheDocument();
  });

  it('프로브 클릭 → fetch 응답을 결과로 표시', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => 'ok',
    } as Response);
    render(<AdminPage />);
    fireEvent.click(screen.getByRole('button', { name: /capture · GET \/health/ }));
    expect(await screen.findByText(/HTTP 200/)).toBeInTheDocument();
  });

  it('fetch 실패 → 실패 메시지 표시', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('네트워크 오류'));
    render(<AdminPage />);
    fireEvent.click(screen.getByRole('button', { name: /location · GET \/health/ }));
    expect(await screen.findByText(/요청 실패/)).toBeInTheDocument();
  });
});
