// useServiceHealth 테스트 — /health 폴링 상태(ok/error) 판정 + 수동 확인
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useServiceHealth, type ServiceDef } from '../hooks/useServiceHealth';

const SVC: ServiceDef[] = [
  { key: 'a', name: 'A', desc: '', url: 'http://svc-a', healthPath: '/health' },
];
const BIG_INTERVAL = 10 ** 7; // 테스트 중 자동 폴링 안 터지게

afterEach(() => vi.restoreAllMocks());

describe('useServiceHealth', () => {
  it('200 + 본문이면 status ok, code 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"status":"ok"}',
    } as Response);
    const { result } = renderHook(() => useServiceHealth(SVC, BIG_INTERVAL));
    await waitFor(() => expect(result.current.health.a.status).toBe('ok'));
    expect(result.current.health.a.code).toBe(200);
    expect(result.current.health.a.body).toContain('ok');
  });

  it('비200이면 error + 코드 보존', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'unavailable',
    } as Response);
    const { result } = renderHook(() => useServiceHealth(SVC, BIG_INTERVAL));
    await waitFor(() => expect(result.current.health.a.status).toBe('error'));
    expect(result.current.health.a.code).toBe(503);
  });

  it('네트워크 실패면 error + code null', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const { result } = renderHook(() => useServiceHealth(SVC, BIG_INTERVAL));
    await waitFor(() => expect(result.current.health.a.status).toBe('error'));
    expect(result.current.health.a.code).toBeNull();
  });

  it('마운트 직후 즉시 폴링 시작 → checking', () => {
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch; // 영원히 pending
    const { result } = renderHook(() => useServiceHealth(SVC, BIG_INTERVAL));
    expect(result.current.health.a.status).toBe('checking');
  });

  it('수동 check(key)로 재확인 가능', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' } as Response);
    const { result } = renderHook(() => useServiceHealth(SVC, BIG_INTERVAL));
    await waitFor(() => expect(result.current.health.a.status).toBe('ok'));
    await act(async () => {
      await result.current.check('a');
    });
    expect(result.current.health.a.status).toBe('ok');
  });
});
