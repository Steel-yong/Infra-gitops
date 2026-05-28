// FrameThrottle 테스트 — skip-to-latest(동시 1개, 처리 중엔 최신만, 중간 폐기)
import { describe, it, expect } from 'vitest';
import { FrameThrottle } from '../capture/frame-throttle';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('FrameThrottle (skip-to-latest)', () => {
  it('한가할 때 제출하면 즉시 처리', async () => {
    const calls: string[] = [];
    const t = new FrameThrottle<string>(async (x) => {
      calls.push(x);
    });
    await t.submit('A');
    expect(calls).toEqual(['A']);
    expect(t.hasPending).toBe(false);
  });

  it('처리 중 들어온 프레임은 최신만 처리하고 중간 것은 버린다', async () => {
    const calls: string[] = [];
    const releases: Array<() => void> = [];
    const t = new FrameThrottle<string>(async (x) => {
      calls.push(x);
      await new Promise<void>((r) => releases.push(r));
    });

    const p = t.submit('A'); // A 처리 시작 → 첫 deferred 대기
    await tick();
    expect(calls).toEqual(['A']);

    void t.submit('B'); // busy → pending=B
    void t.submit('C'); // busy → pending=C (B 폐기)
    expect(t.hasPending).toBe(true);

    releases[0](); // A 완료 → 루프가 최신 pending(C) 처리
    await tick();
    expect(calls).toEqual(['A', 'C']); // B는 처리 안 됨

    releases[1](); // C 완료
    await p;
    expect(t.hasPending).toBe(false);
  });

  it('겹치지 않는 순차 제출은 각각 처리된다', async () => {
    const calls: string[] = [];
    const t = new FrameThrottle<string>(async (x) => {
      calls.push(x);
    });
    await t.submit('A');
    await t.submit('B');
    expect(calls).toEqual(['A', 'B']);
  });

  it('run이 throw해도 reject 안 하고 onError로 보고 + 다음 제출 처리', async () => {
    const calls: string[] = [];
    const errors: unknown[] = [];
    const t = new FrameThrottle<string>(
      async (x) => {
        calls.push(x);
        if (x === 'A') throw new Error('boom');
      },
      (e) => errors.push(e),
    );
    await t.submit('A'); // throw → catch(onError), reject 안 함
    expect(calls).toEqual(['A']);
    expect(errors).toHaveLength(1);
    await t.submit('B');
    expect(calls).toEqual(['A', 'B']);
    expect(t.hasPending).toBe(false);
  });

  it('처리 중 throw + 그 사이 들어온 pending이 흘리지 않고 같은 체인에서 처리 (Codex BLOCKER 회귀)', async () => {
    const calls: string[] = [];
    const releases: Array<() => void> = [];
    const t = new FrameThrottle<string>(async (x) => {
      calls.push(x);
      await new Promise<void>((r) => releases.push(r));
      if (x === 'A') throw new Error('boom'); // A는 release 직후 throw
    });

    const p = t.submit('A'); // A 시작 → 대기
    await tick();
    void t.submit('B'); // 처리 중 → pending=B
    releases[0](); // A 풀림 → A throw → catch → 루프가 최신 pending(B) 처리
    await tick();
    expect(calls).toEqual(['A', 'B']); // B(최신)가 stale로 안 흘리고 처리됨

    releases[1](); // B 완료(throw 없음) → 루프 종료
    await p;
    expect(t.hasPending).toBe(false); // throw 후 stale pending이 남지 않음
  });
});
