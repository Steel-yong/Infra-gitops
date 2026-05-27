// 어드민 로그인 route handler 테스트 — 비번 검증·쿠키 설정·에러 분기
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from '../app/api/admin/login/route';
import { ADMIN_COOKIE, adminToken } from '../lib/admin-auth';

/** req.json()만 쓰는 핸들러용 최소 NextRequest 목. */
function mockReq(body: unknown, throwOnJson = false): NextRequest {
  return {
    json: async () => {
      if (throwOnJson) throw new Error('bad json');
      return body;
    },
  } as unknown as NextRequest;
}

describe('POST /api/admin/login', () => {
  const original = process.env.ADMIN_PASSWORD;
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = 'secret';
  });
  afterEach(() => {
    process.env.ADMIN_PASSWORD = original;
  });

  it('정답 비번 → 200 + httpOnly 토큰 쿠키 설정(원문 비번 아님)', async () => {
    const res = await POST(mockReq({ password: 'secret' }));
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(ADMIN_COOKIE);
    expect(cookie?.value).toBe(await adminToken('secret'));
    expect(cookie?.value).not.toBe('secret');
    expect(cookie?.httpOnly).toBe(true);
  });

  it('오답 비번 → 401, 쿠키 없음', async () => {
    const res = await POST(mockReq({ password: 'nope' }));
    expect(res.status).toBe(401);
    expect(res.cookies.get(ADMIN_COOKIE)).toBeUndefined();
  });

  it('ADMIN_PASSWORD 미설정 → 401 (정답조차 통과 불가)', async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = await POST(mockReq({ password: 'secret' }));
    expect(res.status).toBe(401);
  });

  it('잘못된 JSON 본문 → 400', async () => {
    const res = await POST(mockReq(null, true));
    expect(res.status).toBe(400);
  });
});
