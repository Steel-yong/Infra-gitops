// 어드민 게이트 판정 — 비번 기반 토큰과 인증 쿠키 비교 (서버 전용 순수 로직, 단위 테스트 가능)

/** 어드민 인증 쿠키 이름. 값은 비번 원문이 아니라 토큰(아래 adminToken). */
export const ADMIN_COOKIE = 'admin_auth';

/**
 * 비번에서 쿠키용 토큰(SHA-256 hex)을 만든다. Web Crypto라 Edge·Node 공통.
 * 원문 비번을 쿠키에 담지 않아, 쿠키 유출 시에도 비번이 노출되지 않는다(preimage 저항).
 */
export async function adminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`pubg-helper-admin:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 쿠키 토큰이 현재 비번의 토큰과 일치하면 true.
 * 비번이 미설정(빈값/undefined)이면 항상 false — 게이트를 잠가 무인증 통과를 막는다.
 * @param cookieValue 요청 쿠키의 admin_auth 값(토큰)
 * @param password process.env.ADMIN_PASSWORD
 */
export async function isAdminAuthed(
  cookieValue: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!password || !cookieValue) return false;
  return cookieValue === (await adminToken(password));
}
