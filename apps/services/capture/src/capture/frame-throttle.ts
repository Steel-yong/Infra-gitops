// 프레임 처리 스로틀 — 동시 처리 1개로 제한, 처리 중 들어온 건 최신 1개만 남겨 처리(skip-to-latest).
// 목적: 프레임이 처리속도(2~3초)보다 빨리(0.5초) 들어와도 백로그가 안 쌓이고, 항상 최신만 처리해 부하·밀림을 막는다.

export class FrameThrottle<T> {
  private busy = false;
  private pending: T | null = null;

  /**
   * @param run 항목 1개를 처리하는 비동기 함수 (한 번에 하나만 실행됨).
   * @param onError run이 throw할 때 호출 (한 프레임 실패가 파이프라인을 막지 않게 — 에러를 삼키고 다음으로).
   */
  constructor(
    private readonly run: (item: T) => Promise<void>,
    private readonly onError?: (err: unknown) => void,
  ) {}

  /**
   * 처리 중이면 최신 항목만 보관(이전 보관분 폐기)하고 즉시 반환.
   * 처리 중이 아니면 처리 시작 → 끝나면 그동안 들어온 최신 항목까지 이어서 처리.
   * run이 throw해도 pending을 흘리지 않고(loop 안에서 catch) 다음 최신 항목을 계속 처리한다.
   */
  async submit(item: T): Promise<void> {
    if (this.busy) {
      this.pending = item; // 옛 pending 폐기, 최신만 유지
      return;
    }
    this.busy = true;
    try {
      let current: T | null = item;
      while (current !== null) {
        try {
          await this.run(current);
        } catch (err) {
          // 한 프레임 실패가 스로틀을 막거나 stale pending을 남기지 않게 — 삼키고 계속 드레인.
          this.onError?.(err);
        }
        current = this.pending;
        this.pending = null;
      }
    } finally {
      this.busy = false;
    }
  }

  /** 대기 중 항목 존재 여부 (테스트·디버그용). */
  get hasPending(): boolean {
    return this.pending !== null;
  }
}
