"""여러 상황/경우 깊이 분석 — 사용자 통찰 반영.

분석 대상:
1. 자기장 중심 분포 (페이즈별) — 어디 자주 형성?
2. 페이즈 N → N+1 자기장 이동 (한쪽 쏠림 패턴)
3. 마커-자기장 중심 상대 위치 (자기장 안 어디로 가는가)
4. RGB 팀 추적 (같은 매치 같은 팀 시간별 이동)
"""
import json, sys, math, glob
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))


def load_results(*dirs):
    results = []
    for rd in dirs:
        for p in glob.glob(f"{rd}/*/result.json") + glob.glob(f"{rd}/result.json"):
            try:
                r = json.load(open(p))
                r['_src'] = Path(p).parent.name
                results.append(r)
            except: pass
    return results


def zone_distribution(results):
    """페이즈별 자기장 중심 분포 (자기장 어디 자주 형성)."""
    by_phase = defaultdict(list)
    for r in results:
        for z in r.get('zones_game') or []:
            if z.get('game') and z.get('phase'):
                by_phase[z['phase']].append({'gx': z['game'][0], 'gy': z['game'][1], 'match': z['match'], 'src': r['_src']})

    print("\n=== 페이즈별 자기장 중심 분포 ===")
    for phase, zones in sorted(by_phase.items()):
        gxs = np.array([z['gx'] for z in zones])
        gys = np.array([z['gy'] for z in zones])
        print(f"P{phase}: {len(zones):4d}표본 | "
              f"gx avg={gxs.mean():.3f} std={gxs.std():.3f} | "
              f"gy avg={gys.mean():.3f} std={gys.std():.3f}")
    return by_phase


def zone_drift(results):
    """매치별 페이즈 N → N+1 자기장 중심 이동 (한쪽 쏠림 패턴).
    매치별 페이즈별 자기장 평균 → 인접 페이즈 벡터 차이."""
    by_match = defaultdict(lambda: defaultdict(list))
    for r in results:
        for z in r.get('zones_game') or []:
            if z.get('game') and z.get('phase'):
                key = f"{r['_src']}_m{z['match']}"
                by_match[key][z['phase']].append(z['game'])

    # 매치별 페이즈별 평균
    match_phase = {}
    for key, phases in by_match.items():
        match_phase[key] = {p: (np.mean([c[0] for c in cs]), np.mean([c[1] for c in cs])) for p, cs in phases.items()}

    print("\n=== 페이즈 N → N+1 자기장 이동 (매치 평균) ===")
    drift = defaultdict(list)
    for key, phases in match_phase.items():
        for p in [1, 2, 3, 4]:
            if p in phases and (p+1) in phases:
                dx = phases[p+1][0] - phases[p][0]
                dy = phases[p+1][1] - phases[p][1]
                drift[p].append((dx, dy, math.sqrt(dx*dx+dy*dy)))

    for p, deltas in sorted(drift.items()):
        if not deltas: continue
        dxs = [d[0] for d in deltas]
        dys = [d[1] for d in deltas]
        dists = [d[2] for d in deltas]
        # 방향: 양수 = 동/남, 음수 = 서/북
        avg_dx, avg_dy = np.mean(dxs), np.mean(dys)
        avg_dist = np.mean(dists)
        # 일관 방향 (드리프트)
        std_dist = np.std(dists)
        print(f"P{p}→P{p+1}: 매치 {len(deltas)} | 평균 이동 ({avg_dx:+.3f}, {avg_dy:+.3f}) | 거리={avg_dist:.3f}±{std_dist:.3f}")
        # 방향 분포 (4분면)
        ne = sum(1 for d in deltas if d[0] > 0 and d[1] < 0)
        nw = sum(1 for d in deltas if d[0] < 0 and d[1] < 0)
        se = sum(1 for d in deltas if d[0] > 0 and d[1] > 0)
        sw = sum(1 for d in deltas if d[0] < 0 and d[1] > 0)
        print(f"        방향 분포: NE={ne} NW={nw} SE={se} SW={sw} ← 어느 쪽으로 자주 쏠리는가")


def marker_relative_position(results):
    """마커-자기장 중심 상대 위치 (자기장 안 어디로 가는가).
    자기장 상대 좌표 (-1 ~ +1) 정규화 → 자기장 무관 패턴."""
    PUBG_PHASE_RADII = [0.24474, 0.13461, 0.07403, 0.04072, 0.02036, 0.01018, 0.00509, 0.00254]

    # 매치별 자기장 정보 인덱스
    zone_by_match = defaultdict(dict)
    for r in results:
        for z in r.get('zones_game') or []:
            if z.get('game') and z.get('phase'):
                key = f"{r['_src']}_m{z['match']}"
                if z['phase'] not in zone_by_match[key]:
                    zone_by_match[key][z['phase']] = []
                zone_by_match[key][z['phase']].append(z['game'])

    relative = defaultdict(list)  # {phase: [(rel_x, rel_y), ...]}
    for r in results:
        for m in r.get('markers_game', []):
            phase = m['phase']
            key = f"{r['_src']}_m{m['match']}"
            if phase not in zone_by_match[key]: continue
            zones = zone_by_match[key][phase]
            cx = np.mean([z[0] for z in zones])
            cy = np.mean([z[1] for z in zones])
            r_game = PUBG_PHASE_RADII[phase-1]
            rel_x = (m['gx'] - cx) / r_game
            rel_y = (m['gy'] - cy) / r_game
            relative[phase].append((rel_x, rel_y))

    print("\n=== 마커-자기장 상대 위치 (자기장 안 어디로 가는가) ===")
    for phase in [2, 3, 4, 5]:
        rels = relative[phase]
        if not rels: continue
        rxs = np.array([r[0] for r in rels])
        rys = np.array([r[1] for r in rels])
        inside = sum(1 for r in rels if r[0]**2 + r[1]**2 <= 1)
        center = sum(1 for r in rels if r[0]**2 + r[1]**2 <= 0.25)  # 중심 50% 안
        print(f"P{phase}: {len(rels):4d} 마커 | "
              f"rel_x avg={rxs.mean():+.3f} std={rxs.std():.3f} | "
              f"rel_y avg={rys.mean():+.3f} std={rys.std():.3f} | "
              f"자기장 안={inside}/{len(rels)} ({inside/len(rels)*100:.0f}%) "
              f"중심50%={center} ({center/len(rels)*100:.0f}%)")


def rgb_team_tracking(results, max_examples=5):
    """RGB 기반 팀 추적 — 같은 매치 같은 RGB 마커 = 같은 팀.
    페이즈 1 → 3 이동 분석 (의도적 이동 신호).
    """
    print("\n=== RGB 팀 추적 — 페이즈 1 → 3 이동 분석 ===")

    by_match_team = defaultdict(lambda: defaultdict(list))  # {match: {rgb: [(phase, gx, gy, sec), ...]}}

    for r in results:
        for m in r.get('markers_game', []):
            key = f"{r['_src']}_m{m['match']}"
            rgb_bucket = tuple(round(c/30)*30 for c in m['rgb'])  # 30 단위 양자화
            by_match_team[key][rgb_bucket].append({
                'phase': m['phase'], 'gx': m['gx'], 'gy': m['gy'], 'sec': m['sec'],
            })

    # 페이즈 1 ↔ 3 둘 다 있는 팀 찾기
    teams_with_movement = []
    for match, teams in by_match_team.items():
        for rgb, locs in teams.items():
            p1 = [l for l in locs if l['phase'] == 1]
            p3 = [l for l in locs if l['phase'] == 3]
            if p1 and p3:
                p1_avg = (np.mean([l['gx'] for l in p1]), np.mean([l['gy'] for l in p1]))
                p3_avg = (np.mean([l['gx'] for l in p3]), np.mean([l['gy'] for l in p3]))
                dist = math.sqrt((p3_avg[0]-p1_avg[0])**2 + (p3_avg[1]-p1_avg[1])**2)
                teams_with_movement.append({
                    'match': match, 'rgb': rgb, 'p1': p1_avg, 'p3': p3_avg, 'dist': dist,
                })

    if not teams_with_movement:
        print("  팀 추적 데이터 부족")
        return

    dists = [t['dist'] for t in teams_with_movement]
    print(f"  추적 가능 팀 {len(teams_with_movement)}개 (P1+P3 둘 다)")
    print(f"  이동 거리 평균={np.mean(dists):.3f} 중앙값={np.median(dists):.3f} max={max(dists):.3f}")
    print(f"  이동 분포: 짧음(<0.05)={sum(1 for d in dists if d<0.05)} 중간(0.05~0.15)={sum(1 for d in dists if 0.05<=d<=0.15)} 김(>0.15)={sum(1 for d in dists if d>0.15)}")
    print(f"  의도적 이동 = 0.05+ (40m 이상)")

    # 멀리 이동한 팀의 P3 도착 위치 분포
    far_moved = sorted(teams_with_movement, key=lambda t: -t['dist'])[:max_examples*5]
    if far_moved:
        far_p3 = [(t['p3'][0], t['p3'][1]) for t in far_moved]
        print(f"\n  멀리 이동한 팀 Top {len(far_moved)} P3 도착 좌표 (의도적 명당):")
        for t in far_moved[:max_examples]:
            print(f"    {t['match'][:30]} RGB={t['rgb']} P1({t['p1'][0]:.2f},{t['p1'][1]:.2f})→P3({t['p3'][0]:.2f},{t['p3'][1]:.2f}) dist={t['dist']:.3f}")


def main():
    dirs = ["/tmp/pub34/sanity", "/tmp/pub34/yETU_v2", "/tmp/pub34/weekly_test",
            "/tmp/pub34/batch_extra", "/tmp/pub34/batch_extra2", "/tmp/pub34/batch_50"]
    results = load_results(*dirs)
    print(f"=== 분석 대상: {len(results)} 영상 결과 ===")

    zone_distribution(results)
    zone_drift(results)
    marker_relative_position(results)
    rgb_team_tracking(results)


if __name__ == "__main__":
    main()
