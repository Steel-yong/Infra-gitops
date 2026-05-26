'use client';
// 메인 페이지 — 전체 컴포넌트 조립 및 데이터 흐름 연결

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapType } from '@pubg-helper/shared';
import { MAP_TYPES } from '@pubg-helper/shared';
import { useCaptureSocket } from '../hooks/useCaptureSocket';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useMyungdang, TIER_COLOR, type MyungdangTier } from '../hooks/useMyungdang';
import { useStashLocations } from '../hooks/useStashLocations';
import { useWebNotifications } from '../hooks/useWebNotifications';
import { useOcrTimer } from '../hooks/useOcrTimer';
import { useAlertTimer } from '../hooks/useAlertTimer';
import { useLockedCircle } from '../hooks/useLockedCircle';
import { playAlarmBeep } from '../hooks/playAlarmBeep';
import { useGameEndDetect } from '../hooks/useGameEndDetect';
import { MyungdangPanel } from '../components/MyungdangPanel';
import { TimerPanel } from '../components/TimerPanel';
import styles from './page.module.css';

/** 알람 lead — 사용자 요청: 1초 더 빨리 알림 (반응 시간 확보). */
const CAPTURE_LAG_LEAD_SECONDS = 1;

/** 토글 버튼에 등급 알파벳 옆에 붙일 설명 (명당은 이름이 없으므로 등급 설명으로 대체). */
const TIER_LABEL: Record<MyungdangTier, string> = {
  S: '최상위 명당',
  A: '상위',
  B: '중위',
  C: '하위',
};

/** 비밀창고 토글 버튼 색 — 4등급(빨·주·노·하늘)과 겹치지 않는 보라 (globals.css .stash-marker와 동일). */
const STASH_COLOR = '#a855f7';

const MapCanvas = dynamic(() => import('../components/MapCanvas'), { ssr: false });
const CircleOverlay = dynamic(
  () => import('../components/CircleOverlay').then((m) => ({ default: m.CircleOverlay })),
  { ssr: false },
);
const MyungdangMarkers = dynamic(
  () => import('../components/MyungdangMarkers').then((m) => ({ default: m.MyungdangMarkers })),
  { ssr: false },
);
const StashMarkers = dynamic(
  () => import('../components/StashMarkers').then((m) => ({ default: m.StashMarkers })),
  { ssr: false },
);

export default function Page() {
  const [mapType, setMapType] = useState<MapType>('erangel');
  const [alertEnabled, setAlertEnabled] = useState<number[]>([30, 20, 10]);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [visibleTiers, setVisibleTiers] = useState<Record<MyungdangTier, boolean>>({
    S: true,
    A: true,
    B: true,
    C: true,
  });
  const [showStash, setShowStash] = useState(true);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const { circleData, sendFrame, setIsShrinking, setCurrentPhase, setParentCircle } = useCaptureSocket();
  const { isCapturing, stream, start, stop } = useScreenCapture({
    onFrame: sendFrame,
    onError: (msg) => setCaptureError(msg),
  });
  const stashes = useStashLocations(mapType);
  const { permission, requestPermission } = useWebNotifications();

  const videoRef = useRef<HTMLVideoElement>(null);
  const ocrTimer = useOcrTimer(videoRef.current, isCapturing);

  // 게임 종료(치킨/죽음) 감지 — 종료 시 알람 억제 + 자기장 락 해제(UI 초기화).
  const gameEnd = useGameEndDetect(videoRef.current, isCapturing);
  const gameEndedRef = useRef(false);

  // 위치 락: 한 번 잡으면 고정. 잘못 잡히면 사용자가 "다시 잡기" 버튼으로 unlock.
  const { circle: lockedCircle, unlock: unlockCircle } = useLockedCircle(circleData);

  // lockedCircle을 backend에 parentCircle로 전달 — 다음 페이즈가 이 원 안에서만 검색됨.
  useEffect(() => {
    setParentCircle(lockedCircle);
  }, [lockedCircle, setParentCircle]);

  // 명당(정적 JSON). 자기장이 잡히면 그 안의 명당만 표시(MyungdangMarkers에서 필터).
  const myungdang = useMyungdang(mapType);

  // OCR 타이머 결과를 알림 훅에 전달 — 임계값(사용자 설정) + 1초 lead로 발송
  const { processState: processAlertState } = useAlertTimer({
    thresholds: alertEnabled,
    leadSeconds: CAPTURE_LAG_LEAD_SECONDS,
    onAlert: (seconds) => {
      // 게임 종료(치킨/죽음) 상태면 알람 억제
      if (gameEndedRef.current) return;
      // 비프음은 권한 무관 (탭이 활성화돼 있으면 들림)
      playAlarmBeep();
      // 브라우저 알림은 권한 허용 시
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('자기장 알림', {
          body: `자기장까지 ${seconds}초 남았습니다.`,
        });
      }
    },
  });

  useEffect(() => {
    processAlertState(ocrTimer.remainingSeconds, ocrTimer.isShrinking);
  }, [ocrTimer.remainingSeconds, ocrTimer.isShrinking, processAlertState]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // OCR이 잡은 isShrinking을 capture-service에 전달 — frame upload payload에 동봉됨
  useEffect(() => {
    setIsShrinking(ocrTimer.isShrinking);
  }, [ocrTimer.isShrinking, setIsShrinking]);

  // OCR이 화면에서 직접 읽은 페이즈를 capture에 전달 — hintPhase 우선 사용
  useEffect(() => {
    setCurrentPhase(ocrTimer.currentPhase);
  }, [ocrTimer.currentPhase, setCurrentPhase]);

  // 현재 페이즈 (OCR > 락된 원 > 원 데이터 순).
  const currentPhase = ocrTimer.currentPhase ?? lockedCircle?.phase ?? circleData?.phase ?? null;

  // 자기장 잡히면 상위 15개 추천·강조.
  //  - 페이즈 4+ (후반): 중심에 가까운 순 우선 (자기장 좁아져 위치가 등급보다 중요).
  //  - 그 전: 등급순(S→A→B→C) 우선, C는 S/A/B로 15개 안 찰 때만. (3페이즈는 추후 재검토)
  const RANK_N = 15;
  const TIER_RANK: Record<MyungdangTier, number> = { S: 0, A: 1, B: 2, C: 3 };
  const lateGame = (currentPhase ?? 0) >= 4;
  // 1~2페이즈는 자기장이 거대 → 외곽 말고 중앙 절반 반경 안의 명당만 추천. 그 외엔 전체 반경.
  const radiusFactor = currentPhase != null && currentPhase <= 2 ? 0.5 : 1.0;
  let rankedMyungdang: { tier: MyungdangTier; key: string }[] = [];
  let highlightedKeys = new Set<string>();
  if (lockedCircle && lockedCircle.r > 0) {
    const limit = lockedCircle.r * radiusFactor;
    const inZone = myungdang
      .filter((p) => visibleTiers[p.tier])
      .map((p) => ({ p, d: Math.hypot(p.gx - lockedCircle.x, p.gy - lockedCircle.y) }))
      .filter((x) => x.d <= limit)
      .sort((a, b) =>
        lateGame
          ? a.d - b.d || TIER_RANK[a.p.tier] - TIER_RANK[b.p.tier]
          : TIER_RANK[a.p.tier] - TIER_RANK[b.p.tier] || a.d - b.d,
      )
      .slice(0, RANK_N);
    rankedMyungdang = inZone.map((x) => ({ tier: x.p.tier, key: `${x.p.gx}-${x.p.gy}` }));
    highlightedKeys = new Set(rankedMyungdang.map((r) => r.key));
  }

  // 게임 종료(치킨/죽음) 감지 → 알람 억제 + 자기장 락 해제(추천·마커 자동 초기화).
  // 일반 화면 복귀 시 재무장(다음 판). unlockCircle은 idempotent.
  useEffect(() => {
    if (gameEnd) {
      gameEndedRef.current = true;
      unlockCircle();
    } else {
      gameEndedRef.current = false;
    }
  }, [gameEnd, unlockCircle]);

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span className={styles.logo}>
          PUBG<span className={styles.logoDot}>·</span>Helper
        </span>
      </header>

      <div className={styles.body}>
        {/* ── 왼쪽 사이드바: 맵 선택 + 알림 설정 ── */}
        <aside className={styles.sidebar} aria-label="설정 사이드바">
          <div className={styles.sideSection}>
            <p className={styles.sideSectionLabel}>맵 선택</p>
            <div className={styles.mapButtons} role="group" aria-label="맵 선택">
              {MAP_TYPES.map((type) => (
                <button
                  key={type}
                  className={styles.mapBtn}
                  onClick={() => setMapType(type)}
                  aria-pressed={mapType === type}
                  data-active={mapType === type}
                >
                  {type === 'erangel' ? '에란겔' : '태이고'}
                </button>
              ))}
            </div>
          </div>

          <TimerPanel
            state={ocrTimer}
            isCapturing={isCapturing}
            phase={currentPhase}
          />

          <div className={styles.sideSection}>
            <p className={styles.sideSectionLabel}>자기장 알림</p>
            <div className={styles.alertList} aria-label="알림 설정">
              {([30, 20, 10] as const).map((seconds) => (
                <label key={seconds} className={styles.alertItem}>
                  <input
                    type="checkbox"
                    className={styles.alertCheckbox}
                    checked={alertEnabled.includes(seconds)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAlertEnabled([...alertEnabled, seconds]);
                      } else {
                        setAlertEnabled(alertEnabled.filter((s) => s !== seconds));
                      }
                    }}
                    aria-label={`${seconds}초 알림`}
                  />
                  <span className={styles.alertLabel}>{seconds}초 전 알림</span>
                </label>
              ))}
            </div>
            {permission === 'denied' && (
              <p className={styles.permissionDenied}>
                브라우저 알림 권한이 거부되었습니다.
              </p>
            )}
            {permission === 'default' && (
              <button className={styles.permissionBtn} onClick={requestPermission}>
                알림 권한 허용
              </button>
            )}
          </div>

        </aside>

        {/* ── 가운데: 화면공유 섹션 (3.5) ── */}
        <div className={styles.captureSection}>
          <div className={styles.captureSectionHeader}>
            <p className={styles.sideSectionLabel}>화면공유</p>
            <button
              className={`${styles.captureBtn} ${isCapturing ? styles.captureBtnStop : styles.captureBtnStart}`}
              onClick={isCapturing ? stop : start}
              aria-pressed={isCapturing}
            >
              {isCapturing ? '공유 종료' : '공유 시작'}
            </button>
            {captureError && (
              <p className={styles.captureError}>{captureError}</p>
            )}
            {isCapturing && (
              <button
                type="button"
                onClick={unlockCircle}
                disabled={!lockedCircle}
                aria-label="자기장 위치 다시 잡기"
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 170, 60, 0.18)',
                  color: '#ffb547',
                  border: '1px solid rgba(255, 170, 60, 0.45)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  cursor: lockedCircle ? 'pointer' : 'not-allowed',
                  opacity: lockedCircle ? 1 : 0.5,
                }}
              >
                자기장 다시 잡기
              </button>
            )}
          </div>

          <div className={styles.previewWrapper}>
            <video
              ref={videoRef}
              className={styles.previewVideo}
              style={{ display: stream ? 'block' : 'none' }}
              autoPlay
              muted
              playsInline
            />
            {!stream && (
              <span className={styles.previewPlaceholder}>
                화면공유 시작 후<br />미리보기가 표시됩니다
              </span>
            )}
          </div>
        </div>

        {/* ── 맵 영역 (6.5) ── */}
        <div className={styles.mapArea}>
          <div
            className={styles.mapAreaHeader}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
          >
            <p className={styles.sideSectionLabel} style={{ margin: 0 }}>지도</p>
            <div role="group" aria-label="명당 등급 표시" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['S', 'A', 'B', 'C'] as const).map((tier) => {
                const on = visibleTiers[tier];
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setVisibleTiers((v) => ({ ...v, [tier]: !v[tier] }))}
                    aria-pressed={on}
                    aria-label={`${tier} 등급 표시`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: `2px solid ${TIER_COLOR[tier]}`,
                      background: on ? 'rgba(255,255,255,0.06)' : 'transparent',
                      color: '#e6edf3',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      opacity: on ? 1 : 0.4,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: `2px solid ${TIER_COLOR[tier]}`,
                      }}
                    />
                    {tier} {TIER_LABEL[tier]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowStash((s) => !s)}
                aria-pressed={showStash}
                aria-label="비밀창고 표시"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `2px solid ${STASH_COLOR}`,
                  background: showStash ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: '#e6edf3',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  opacity: showStash ? 1 : 0.4,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    border: `2px solid ${STASH_COLOR}`,
                  }}
                />
                💰 비밀창고
              </button>
            </div>
          </div>
          <div className={styles.mapAreaCanvas}>
            <MapCanvas mapType={mapType}>
              {showStash && <StashMarkers stashes={stashes} />}
              <CircleOverlay circleData={lockedCircle} />
              <MyungdangMarkers points={myungdang} visibleTiers={visibleTiers} zone={lockedCircle} highlightedKeys={highlightedKeys} hoveredKey={hoveredKey} />
            </MapCanvas>
          </div>
        </div>

        {/* ── 오른쪽 사이드바: 위치 추천 ── */}
        <aside className={styles.rightSidebar} aria-label="추천 사이드바">
          <div className={styles.sideSection}>
            <p className={styles.sideSectionLabel}>추천</p>
          </div>
          <div className={styles.sideSection} style={{ flex: 1, overflowY: 'auto' }}>
            <MyungdangPanel zoneActive={!!lockedCircle} ranked={rankedMyungdang} onHover={setHoveredKey} />
          </div>
        </aside>
      </div>
    </main>
  );
}
