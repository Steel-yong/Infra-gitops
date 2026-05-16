'use client';
// 자기장 알림 사운드 — public/audio/alarm.m4a 재생 (사용자 제공 음원)

const ALARM_SRC = '/audio/alarm.m4a';

/**
 * 자기장 알람 사운드 재생.
 * 매 호출마다 새 Audio 인스턴스 생성 — 30/20/10초 다중 알람이 겹쳐 울릴 수도 있어 인스턴스 분리.
 * 브라우저 자동재생 정책으로 사용자 상호작용 이후에만 재생됨.
 */
export function playAlarmBeep(): void {
  if (typeof window === 'undefined') return;

  try {
    const audio = new Audio(ALARM_SRC);
    audio.volume = 0.85;
    void audio.play().catch((err) => {
      console.warn('[알람] 사운드 재생 실패:', err);
    });
  } catch (err) {
    console.warn('[알람] Audio 생성 실패:', err);
  }
}
