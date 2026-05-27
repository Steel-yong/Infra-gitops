'use client';
// 어드민 — ArgoCD식 백엔드 서비스 헬스 대시보드 (자동 폴링 + 수동 확인 + 상태 색)
import { useState } from 'react';
import styles from './admin.module.css';
import {
  useServiceHealth,
  type HealthStatus,
  type ServiceDef,
} from '../../hooks/useServiceHealth';

const CAPTURE = process.env.NEXT_PUBLIC_CAPTURE_SERVICE_URL ?? 'http://127.0.0.1:3001';
const LOCATION = process.env.NEXT_PUBLIC_LOCATION_SERVICE_URL ?? 'http://127.0.0.1:3002';
const ALERT = process.env.NEXT_PUBLIC_ALERT_SERVICE_URL ?? 'http://127.0.0.1:3003';

const POLL_MS = 10000;

const SERVICES: ServiceDef[] = [
  {
    key: 'capture',
    name: 'capture-service',
    desc: '화면공유 프레임 수신 → 전체맵 자기장 원 검출 (WebSocket :3001)',
    url: CAPTURE,
    healthPath: '/health',
  },
  {
    key: 'location',
    name: 'location-service',
    desc: '자기장 원 안 프로 위치 필터 + 거리순 S/A/B 등급 추천 (:3002)',
    url: LOCATION,
    healthPath: '/health',
  },
  {
    key: 'alert',
    name: 'alert-service',
    desc: '미니맵 타이머 OCR + 자기장 알림 30/20/10초 (:3003)',
    url: ALERT,
    healthPath: '/health',
  },
];

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok: '정상',
  error: '오류',
  checking: '확인중',
  unknown: '대기',
};

const STATUS_CLASS: Record<HealthStatus, string> = {
  ok: styles.statusOk,
  error: styles.statusError,
  checking: styles.statusChecking,
  unknown: styles.statusUnknown,
};

function fmtTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('ko-KR');
}

export default function AdminPage() {
  const { health, check } = useServiceHealth(SERVICES, POLL_MS);
  const [apiResult, setApiResult] = useState<string>('');
  const [apiLoading, setApiLoading] = useState(false);

  const callLocations = async (): Promise<void> => {
    setApiLoading(true);
    try {
      const res = await fetch(`${LOCATION}/locations?mapType=erangel`);
      const text = await res.text();
      setApiResult(`HTTP ${res.status}\n${text.slice(0, 1500)}`);
    } catch (e) {
      setApiResult(`요청 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setApiLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>서비스 헬스 대시보드</h1>
          <p className={styles.subtle}>{POLL_MS / 1000}초마다 자동 확인 · 각 서비스 /health 폴링</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.button} type="button" onClick={() => void check()}>
            전체 새로고침
          </button>
          <button className={styles.linkButton} type="button" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>

      <section className={styles.cardGrid}>
        {SERVICES.map((svc) => {
          const h = health[svc.key];
          return (
            <article
              key={svc.key}
              className={`${styles.card} ${STATUS_CLASS[h.status]}`}
              data-testid={`card-${svc.key}`}
              data-status={h.status}
            >
              <div className={styles.cardTop}>
                <span className={styles.dot} aria-hidden />
                <h2 className={styles.cardName}>{svc.name}</h2>
                <span className={styles.badge}>{STATUS_LABEL[h.status]}</span>
              </div>
              <p className={styles.cardDesc}>{svc.desc}</p>
              <dl className={styles.meta}>
                <div><dt>코드</dt><dd>{h.code ?? '—'}</dd></div>
                <div><dt>지연</dt><dd>{h.latencyMs != null ? `${h.latencyMs}ms` : '—'}</dd></div>
                <div><dt>확인</dt><dd>{fmtTime(h.checkedAt)}</dd></div>
              </dl>
              {h.body && <pre className={styles.cardBody}>{h.body}</pre>}
              <button
                className={styles.button}
                type="button"
                onClick={() => void check(svc.key)}
                disabled={h.status === 'checking'}
              >
                {h.status === 'checking' ? '확인 중…' : '지금 확인'}
              </button>
            </article>
          );
        })}
      </section>

      <section className={styles.apiSection}>
        <h2 className={styles.cardName}>엔드포인트 직접 호출</h2>
        <button className={styles.button} type="button" onClick={callLocations} disabled={apiLoading}>
          {apiLoading ? '호출 중…' : 'location · GET /locations?mapType=erangel'}
        </button>
        {apiResult && <pre className={styles.cardBody}>{apiResult}</pre>}
      </section>
    </main>
  );
}
