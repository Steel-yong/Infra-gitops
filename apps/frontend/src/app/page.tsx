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
import { LocationPanel } from '../components/LocationPanel';
import styles from './page.module.css';

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

  const { circleData, sendFrame } = useCaptureSocket();
  const { isCapturing, stream, start, stop } = useScreenCapture({
    onFrame: sendFrame,
    onError: (msg) => setCaptureError(msg),
  });
  const { locations, error: locationError } = useLocations(circleData, mapType);
  const stashes = useStashLocations(mapType);
  const { permission, requestPermission } = useWebNotifications();

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span className={styles.logo}>
          PUBG<span className={styles.logoDot}>·</span>Helper
        </span>
      </header>

      <div className={styles.body}>
        {/* ── 왼쪽 사이드바: 맵 선택 + 알림 설정 ── */}
        <aside className={styles.sidebar}>
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

          <div className={styles.sideSection} style={{ flex: 1, overflowY: 'auto' }}>
            <LocationPanel
              locations={locations}
              circleData={circleData}
              error={locationError}
            />
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

        {/* ── 오른쪽: 맵 영역 (6.5) ── */}
        <div className={styles.mapArea}>
          <MapCanvas mapType={mapType}>
            <StashMarkers stashes={stashes} />
            <CircleOverlay circleData={circleData} />
            <LocationMarkers locations={locations} />
          </MapCanvas>
        </div>
      </div>
    </main>
  );
}
