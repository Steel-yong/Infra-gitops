'use client';
// 자기장 알림 비프음 — Web Audio API로 1.8초간 4회 비프 패턴 재생 (외부 mp3 불필요)

let cachedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!cachedCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    cachedCtx = new Ctor();
  }
  // 브라우저 정책으로 suspend 상태일 수 있어 resume 시도
  if (cachedCtx.state === 'suspended') {
    cachedCtx.resume().catch(() => {});
  }
  return cachedCtx;
}

/**
 * 자기장 알람 비프음 재생.
 * 880Hz 사인파, 4번 비프(0.25s ON / 0.2s OFF), 총 ~1.8초.
 * 짧지 않게 만들어 사용자가 놓치지 않도록.
 */
export function playAlarmBeep(): void {
  const ctx = getContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = 880; // A5 — 또렷한 알람 톤

    // 4회 비프: 매 ON 0.25s + OFF 0.2s
    const now = ctx.currentTime;
    const peak = 0.35; // 음량
    const pattern = [
      [0.00, 0.25],
      [0.45, 0.70],
      [0.90, 1.15],
      [1.35, 1.60],
    ];
    gain.gain.setValueAtTime(0, now);
    for (const [start, end] of pattern) {
      // 빠른 페이드인 / 페이드아웃으로 클릭 노이즈 방지
      gain.gain.linearRampToValueAtTime(peak, now + start + 0.02);
      gain.gain.setValueAtTime(peak, now + end - 0.02);
      gain.gain.linearRampToValueAtTime(0, now + end);
    }
    osc.start(now);
    osc.stop(now + 1.7);
  } catch (err) {
    console.warn('[알람] 비프음 재생 실패:', err);
  }
}
