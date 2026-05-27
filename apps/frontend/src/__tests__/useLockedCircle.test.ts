// useLockedCircle 테스트 — sticky 락 + 페이즈 단조 갱신 + 낮은페이즈 연속=새게임 재락 (회귀 안전망)
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLockedCircle } from '../hooks/useLockedCircle';
import type { CircleData } from '@pubg-helper/shared';

const c = (phase: number, x = 0.5, y = 0.5): CircleData => ({ x, y, r: 0.1, phase });

function setup(initial: CircleData | null) {
  return renderHook(({ rc }: { rc: CircleData | null }) => useLockedCircle(rc), {
    initialProps: { rc: initial },
  });
}

describe('useLockedCircle', () => {
  it('① 첫 유효 검출을 락한다 (null일 땐 락 없음)', () => {
    const { result, rerender } = setup(null);
    expect(result.current.circle).toBeNull();
    rerender({ rc: c(1) });
    expect(result.current.circle?.phase).toBe(1);
  });

  it('② 더 높은 페이즈면 갱신한다', () => {
    const { result, rerender } = setup(c(1));
    expect(result.current.circle?.phase).toBe(1);
    rerender({ rc: c(2) });
    expect(result.current.circle?.phase).toBe(2);
  });

  it('③ 낮은 페이즈 4연속까진 유지, 5연속이면 새 게임으로 재락', () => {
    const { result, rerender } = setup(c(3));
    expect(result.current.circle?.phase).toBe(3);
    for (let i = 0; i < 4; i++) rerender({ rc: c(1, 0.2, 0.2) }); // 4연속
    expect(result.current.circle?.phase).toBe(3); // 아직 유지
    rerender({ rc: c(1, 0.2, 0.2) }); // 5연속 → 재락
    expect(result.current.circle?.phase).toBe(1);
    expect(result.current.circle?.x).toBe(0.2);
  });

  it('④ 같은 페이즈/null이면 유지 (위치 안정)', () => {
    const { result, rerender } = setup(c(2, 0.5, 0.5));
    rerender({ rc: c(2, 0.9, 0.9) }); // 같은 페이즈, 다른 위치
    expect(result.current.circle?.x).toBe(0.5); // 원래 위치 유지
    rerender({ rc: null });
    expect(result.current.circle?.phase).toBe(2); // null이어도 유지
  });

  it('낮은 페이즈 연속 중 같은/높은 페이즈가 끼면 streak 리셋된다', () => {
    const { result, rerender } = setup(c(3));
    for (let i = 0; i < 4; i++) rerender({ rc: c(1, 0.2, 0.2) }); // 4연속
    rerender({ rc: c(3) }); // 같은 페이즈 → streak 리셋
    for (let i = 0; i < 4; i++) rerender({ rc: c(1, 0.2, 0.2) }); // 리셋 후 다시 4연속
    expect(result.current.circle?.phase).toBe(3); // 아직 재락 안 됨 (리셋됐으므로)
    rerender({ rc: c(1, 0.2, 0.2) }); // 5연속 → 재락
    expect(result.current.circle?.phase).toBe(1);
  });

  it('unlock() 후 다음 검출을 새로 락한다', () => {
    const { result, rerender } = setup(c(2));
    act(() => result.current.unlock());
    rerender({ rc: c(4, 0.3, 0.3) });
    expect(result.current.circle?.phase).toBe(4);
  });
});
