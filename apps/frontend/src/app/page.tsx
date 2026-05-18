'use client';
// 메인 페이지 — 전체 컴포넌트 조립 및 데이터 흐름 연결

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapType } from '@pubg-helper/shared';
import { MAP_TYPES } from '@pubg-helper/shared';
import { useCaptureSocket } from '../hooks/useCaptureSocket';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useLocations } from '../hooks/useLocations';
import { useStashLocations } from '../hooks/useStashLocations';
import { useWebNotifications } from '../hooks/useWebNotifications';
import { useOcrTimer } from '../hooks/useOcrTimer';
import { useAlertTimer } from '../hooks/useAlertTimer';
import { useLockedCircle } from '../hooks/useLockedCircle';
import { playAlarmBeep } from '../hooks/playAlarmBeep';
import { LocationPanel } from '../components/LocationPanel';
import { TimerPanel } from '../components/TimerPanel';
import styles from './page.module.css';

/** 알람 lead — 사용자 요청: 1초 더 빨리 알림 (반응 시간 확보). */
const CAPTURE_LAG_LEAD_SECONDS = 1;

const MapCanvas = dynamic(() => import('../components/MapCanvas'), { ssr: false });
const CircleOverlay = dynamic(
  () => import('../components/CircleOverlay').then((m) => ({ default: m.CircleOverlay })),
  { ssr: false },
);
const LocationMarkers = dynamic(
  () => import('../components/LocationMarkers').then((m) => ({ default: m.LocationMarkers })),
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

  const { circleData, sendFrame, setIsShrinking, setCurrentPhase, setParentCircle } = useCaptureSocket();
  const { isCapturing, stream, start, stop } = useScreenCapture({
    onFrame: sendFrame,
    onError: (msg) => setCaptureError(msg),
  });
  const stashes = useStashLocations(mapType);
  const { permission, requestPermission } = useWebNotifications();

  const videoRef = useRef<HTMLVideoElement>(null);
  const ocrTimer = useOcrTimer(videoRef.current, isCapturing);

  // 위치 락: 한 번 잡으면 고정. 잘못 잡히면 사용자가 "다시 잡기" 버튼으로 unlock.
  const { circle: lockedCircle, unlock: unlockCircle } = useLockedCircle(circleData);

  // lockedCircle을 backend에 parentCircle로 전달 — 다음 페이즈가 이 원 안에서만 검색됨.
  useEffect(() => {
    setParentCircle(lockedCircle);
  }, [lockedCircle, setParentCircle]);

  // 위치 추천도 락된 원 기준으로 (락 안 됐으면 동작 안 함)
  const { locations, error: locationError } = useLocations(lockedCircle, mapType);

  // OCR 타이머 결과를 알림 훅에 전달 — 임계값(사용자 설정) + 1초 lead로 발송
  const { processState: processAlertState } = useAlertTimer({
    thresholds: alertEnabled,
    leadSeconds: CAPTURE_LAG_LEAD_SECONDS,
    onAlert: (seconds) => {
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
            phase={ocrTimer.currentPhase ?? lockedCircle?.phase ?? circleData?.phase ?? null}
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
          <div className={styles.mapAreaHeader}>
            <p className={styles.sideSectionLabel}>지도</p>
          </div>
          <div className={styles.mapAreaCanvas}>
            <MapCanvas mapType={mapType}>
              <StashMarkers stashes={stashes} />
              <CircleOverlay circleData={lockedCircle} />
              <LocationMarkers locations={locations} />
            </MapCanvas>
          </div>
        </div>

        {/* ── 오른쪽 사이드바: 위치 추천 ── */}
        <aside className={styles.rightSidebar} aria-label="위치 추천 사이드바">
          <div className={styles.sideSection}>
            <p className={styles.sideSectionLabel}>추천 위치</p>
          </div>
          <div className={styles.sideSection} style={{ flex: 1, overflowY: 'auto' }}>
            <LocationPanel
              locations={locations}
              circleData={circleData}
              error={locationError}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
