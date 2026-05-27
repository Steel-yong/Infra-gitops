// /admin 경로를 env 비번 쿠키로 게이트하는 미들웨어 (로그인 페이지는 통과)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, isAdminAuthed } from './lib/admin-auth';

export async function middleware(req: NextRequest): Promise<NextResponse> {
  // 로그인 폼은 게이트 대상에서 제외(무한 리다이렉트 방지).
  if (req.nextUrl.pathname === '/admin/login') return NextResponse.next();

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (await isAdminAuthed(cookie, process.env.ADMIN_PASSWORD)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
