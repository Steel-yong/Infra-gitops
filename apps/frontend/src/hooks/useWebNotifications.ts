// Web Notifications API 권한 관리 및 알림 발송 훅
import { useCallback, useRef, useState } from 'react';

export interface UseWebNotificationsReturn {
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  /** 잔여 초와 활성 임계값 목록을 받아 해당 초에 알림을 1회 발송한다. */
  trigger: (remainingSeconds: number, enabledThresholds: number[]) => void;
}

/**
 * 동일 임계값에 여러 프레임이 도달해도 알림은 1회만 발송한다.
 * 타이머가 최대 임계값을 초과하면 (새 자기장 라운드) 발송 기록을 초기화한다.
 */
export function useWebNotifications(): UseWebNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const lastFiredRef = useRef<number | null>(null);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const trigger = useCallback(
    (remainingSeconds: number, enabledThresholds: number[]) => {
      if (permission !== 'granted' || enabledThresholds.length === 0) return;

      const maxThreshold = Math.max(...enabledThresholds);
      if (remainingSeconds > maxThreshold) {
        lastFiredRef.current = null;
      }

      if (
        enabledThresholds.includes(remainingSeconds) &&
        lastFiredRef.current !== remainingSeconds
      ) {
        lastFiredRef.current = remainingSeconds;
        new Notification('자기장 알림', {
          body: `자기장까지 ${remainingSeconds}초 남았습니다.`,
        });
      }
    },
    [permission],
  );

  return { permission, requestPermission, trigger };
}
