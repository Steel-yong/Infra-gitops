'use client';
// 어드민 API 테스트 패널 — 각 백엔드 서비스 엔드포인트 호출 → 상태코드·응답 표시
import { useState } from 'react';
import styles from './admin.module.css';

const CAPTURE = process.env.NEXT_PUBLIC_CAPTURE_SERVICE_URL ?? 'http://127.0.0.1:3001';
const LOCATION = process.env.NEXT_PUBLIC_LOCATION_SERVICE_URL ?? 'http://127.0.0.1:3002';
const ALERT = process.env.NEXT_PUBLIC_ALERT_SERVICE_URL ?? 'http://127.0.0.1:3003';

type Probe = { label: string; url: string };

const PROBES: Probe[] = [
  { label: 'capture · GET /health', url: `${CAPTURE}/health` },
  { label: 'location · GET /health', url: `${LOCATION}/health` },
  { label: 'location · GET /locations?mapType=erangel', url: `${LOCATION}/locations?mapType=erangel` },
  { label: 'alert · GET /health', url: `${ALERT}/health` },
];

export default function AdminPage() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const call = async (probe: Probe): Promise<void> => {
    setLoading(probe.url);
    try {
      const res = await fetch(probe.url);
      const text = await res.text();
      setResults((prev) => ({ ...prev, [probe.url]: `HTTP ${res.status}\n${text.slice(0, 2000)}` }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [probe.url]: `요청 실패: ${e instanceof Error ? e.message : String(e)}`,
      }));
    } finally {
      setLoading(null);
    }
  };

  const logout = async (): Promise<void> => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>어드민 — API 테스트</h1>
        <button className={styles.linkButton} type="button" onClick={logout}>
          로그아웃
        </button>
      </header>
      <ul className={styles.probeList}>
        {PROBES.map((probe) => (
          <li key={probe.url} className={styles.probe}>
            <button
              className={styles.button}
              type="button"
              onClick={() => call(probe)}
              disabled={loading === probe.url}
            >
              {loading === probe.url ? '호출 중…' : probe.label}
            </button>
            {results[probe.url] && <pre className={styles.result}>{results[probe.url]}</pre>}
          </li>
        ))}
      </ul>
    </main>
  );
}
