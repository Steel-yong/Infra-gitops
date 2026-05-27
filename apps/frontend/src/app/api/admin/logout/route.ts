// 어드민 로그아웃 — 인증 쿠키 삭제
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '../../../../lib/admin-auth';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
