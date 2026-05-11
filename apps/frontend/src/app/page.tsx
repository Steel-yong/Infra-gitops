'use client';
// 메인 페이지 — 전체 컴포넌트 조립 및 데이터 흐름 연결
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapSelector } from '../components/MapSelector';
import { CircleOverlay } from '../components/CircleOverlay';
import { LocationMarkers } from '../components/LocationMarkers';
import { LocationPanel } from '../components/LocationPanel';
import { AlertSettings } from '../components/AlertSettings';
import { ScreenShareButton } from '../components/ScreenShareButton';
import { MainLayout } from '../components/MainLayout';
import { useCaptureSocket } from '../hooks/useCaptureSocket';
import { useScreenCapture } from '../hooks/useScreenCapture';
import { useLocations } from '../hooks/useLocations';
import { useWebNotifications } from '../hooks/useWebNotifications';
import type { MapType } from '@pubg-helper/shared';

const MapCanvas = dynamic(() => import('../components/MapCanvas'), { ssr: false });

export default function Page() {
  const [mapType, setMapType] = useState<MapType>('erangel');
  const [alertEnabled, setAlertEnabled] = useState<number[]>([30, 20, 10]);

  const { circleData, sendFrame } = useCaptureSocket();
  const { isCapturing, start, stop } = useScreenCapture({ onFrame: sendFrame });
  const { locations, error: locationError } = useLocations(circleData, mapType);
  const { permission, requestPermission } = useWebNotifications();

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.75rem 1rem',
          background: '#111',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>PUBG Helper</span>
        <MapSelector mapType={mapType} onChange={setMapType} />
        <ScreenShareButton isCapturing={isCapturing} onStart={start} onStop={stop} />
        <AlertSettings
          enabled={alertEnabled}
          onChange={setAlertEnabled}
          permissionDenied={permission === 'denied'}
        />
        {permission === 'default' && (
          <button onClick={requestPermission}>알림 권한 허용</button>
        )}
      </header>
      <MainLayout
        map={
          <MapCanvas mapType={mapType}>
            <CircleOverlay circleData={circleData} />
            <LocationMarkers locations={locations} />
          </MapCanvas>
        }
        panel={
          <LocationPanel
            locations={locations}
            circleData={circleData}
            error={locationError}
          />
        }
      />
    </main>
  );
}
