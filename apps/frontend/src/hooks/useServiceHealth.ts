'use client';
// 백엔드 서비스 /health를 주기적으로 폴링하는 훅 — ArgoCD식 상태 대시보드용
import { useCallback, useEffect, useRef, useState } from 'react';

export type HealthStatus = 'ok' | 'error' | 'checking' | 'unknown';

export interface ServiceHealth {
  status: HealthStatus;
  /** HTTP 상태코드. 네트워크 실패면 null. */
  code: number | null;
  /** 응답까지 걸린 ms. 실패면 null. */
  latencyMs: number | null;
  /** 응답 본문 일부(또는 에러 메시지). */
  body: string;
  /** 마지막 확인 시각(epoch ms). 미확인이면 null. */
  checkedAt: number | null;
}

export interface ServiceDef {
  key: string;
  name: string;
  desc: string;
  /** 서비스 베이스 URL (브라우저에서 도달 가능, 예 http://127.0.0.1:3001). */
  url: string;
  /** 헬스 경로 (예 /health). */
  healthPath: string;
}

const TIMEOUT_MS = 4000;

/** 단일 서비스 /health 요청 → 상태·지연·본문 측정. 예외를 던지지 않는다. */
async function probe(target: string): Promise<ServiceHealth> {
  const started =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, { signal: ctrl.signal, cache: 'no-store' });
    const text = await res.text();
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      status: res.ok ? 'ok' : 'error',
      code: res.status,
      latencyMs: Math.round(end - started),
      body: text.slice(0, 200),
      checkedAt: Date.now(),
    };
  } catch (e) {
    return {
      status: 'error',
      code: null,
      latencyMs: null,
      body: e instanceof Error ? e.message : String(e),
      checkedAt: Date.now(),
    };
  } finally {
    clearTimeout(timer);
  }
}

function initialHealth(services: ServiceDef[]): Record<string, ServiceHealth> {
  const out: Record<string, ServiceHealth> = {};
  for (const s of services) {
    out[s.key] = { status: 'unknown', code: null, latencyMs: null, body: '', checkedAt: null };
  }
  return out;
}

/**
 * services 목록의 /health를 intervalMs마다 자동 폴링한다.
 * @returns health(키별 상태) + check(수동 확인; key 주면 그 서비스만, 없으면 전부)
 */
export function useServiceHealth(services: ServiceDef[], intervalMs = 10000) {
  const [health, setHealth] = useState<Record<string, ServiceHealth>>(() =>
    initialHealth(services),
  );
  const mounted = useRef(true);
  // 서비스별 최신 요청 순번 — 겹친 폴링에서 느린 옛 응답이 최신을 덮지 않게 한다.
  const reqId = useRef<Record<string, number>>({});

  const check = useCallback(
    async (key?: string): Promise<void> => {
      const targets = key ? services.filter((s) => s.key === key) : services;
      const ids: Record<string, number> = {};
      for (const s of targets) {
        ids[s.key] = (reqId.current[s.key] ?? 0) + 1;
        reqId.current[s.key] = ids[s.key];
      }
      setHealth((prev) => {
        const next = { ...prev };
        for (const s of targets) next[s.key] = { ...next[s.key], status: 'checking' };
        return next;
      });
      await Promise.all(
        targets.map(async (s) => {
          const result = await probe(s.url + s.healthPath);
          // 더 새 요청이 이미 떴거나 언마운트면 이 결과는 버린다.
          if (!mounted.current || reqId.current[s.key] !== ids[s.key]) return;
          setHealth((prev) => ({ ...prev, [s.key]: result }));
        }),
      );
    },
    [services],
  );

  useEffect(() => {
    mounted.current = true;
    void check();
    const id = setInterval(() => void check(), intervalMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [check, intervalMs]);

  return { health, check };
}
