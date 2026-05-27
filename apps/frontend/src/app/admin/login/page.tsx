'use client';
// 어드민 로그인 폼 — 비번 제출 → /api/admin/login → 성공 시 /admin 이동
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import styles from '../admin.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) router.push('/admin');
      else setError('비밀번호가 올바르지 않습니다.');
    } catch {
      setError('로그인 요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.root}>
      <form className={styles.loginCard} onSubmit={submit}>
        <h1 className={styles.title}>어드민 로그인</h1>
        <input
          className={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="비밀번호"
        />
        <button className={styles.button} type="submit" disabled={busy}>
          {busy ? '확인 중…' : '로그인'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </main>
  );
}
