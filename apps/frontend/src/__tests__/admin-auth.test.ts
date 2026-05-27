// admin-auth 헬퍼 테스트 — 토큰 일치 판정 + 비번 미설정 잠금 + 비번 비노출
import { describe, it, expect } from 'vitest';
import { isAdminAuthed, adminToken, ADMIN_COOKIE } from '../lib/admin-auth';

describe('isAdminAuthed', () => {
  it('쿠키 토큰이 비번 토큰과 일치하면 true', async () => {
    const token = await adminToken('secret');
    expect(await isAdminAuthed(token, 'secret')).toBe(true);
  });

  it('쿠키가 비번 토큰과 다르면 false', async () => {
    expect(await isAdminAuthed('wrong-token', 'secret')).toBe(false);
  });

  it('원문 비번을 쿠키에 넣어도 false (쿠키는 토큰이어야 함)', async () => {
    expect(await isAdminAuthed('secret', 'secret')).toBe(false);
  });

  it('쿠키가 없으면 false', async () => {
    expect(await isAdminAuthed(undefined, 'secret')).toBe(false);
  });

  it('비번 미설정(undefined)이면 — 쿠키와 무관하게 false (게이트 잠금)', async () => {
    expect(await isAdminAuthed('anything', undefined)).toBe(false);
  });

  it('비번이 빈 문자열이면 false', async () => {
    expect(await isAdminAuthed('', '')).toBe(false);
  });
});

describe('adminToken', () => {
  it('SHA-256 hex(64자)이고 원문 비번을 포함하지 않는다', async () => {
    const t = await adminToken('secret');
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(t).not.toContain('secret');
  });

  it('다른 비번은 다른 토큰', async () => {
    expect(await adminToken('a')).not.toBe(await adminToken('b'));
  });
});

describe('상수', () => {
  it('쿠키 이름', () => {
    expect(ADMIN_COOKIE).toBe('admin_auth');
  });
});
