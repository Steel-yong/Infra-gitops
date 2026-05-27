// 어드민 로그인 — env 비번 검증 후 httpOnly 인증 쿠키 설정
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '../../../../lib/admin-auth';

const MAX_AGE = 60 * 60 * 8; // 8시간

export async function POST(req: NextRequest): Promise<NextResponse> {
  const password = process.env.ADMIN_PASSWORD;

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: '잘못된 요청 본문' }, { status: 400 });
  }

  if (!password || body.password !== password) {
    return NextResponse.json({ ok: false, error: '비밀번호 불일치' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminToken(password), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
