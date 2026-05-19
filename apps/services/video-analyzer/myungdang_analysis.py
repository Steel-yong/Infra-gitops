"""진짜 명당 분석 — 사용자 통찰 기반 알고리즘.

명당 정의 (사용자 정리):
1. 페이즈 1 (대도시 드롭)에서 이동해 자기장 안 더 좋은 위치
2. 한 팀이 넓게 먹는 위치 (영향력)
3. 대도시 안 건물 아닌 자기장 안 작은 건물들
4. 능선/호 같은 자연 지형 위치

분석 알고리즘:
1. 페이즈 1 마커 자동 클러스터링 → 대도시 6~10곳 자동 검출
2. 페이즈 2~3 마커 중:
   - 대도시 안 마커 제외 (그냥 도시 머무름)
   - 자기장 안에 있는 것만
   - 자기장 중심 거리 작을수록 가중 (외곽 버티기 ↓)
3. 매치 다양성 (여러 매치 공통) 가중
4. RGB 추적 가능시 한 팀 넓게 먹는 위치 별도 점수

출력:
- 페이즈 1 대도시 (자동 도출)
- 페이즈 2~3 진짜 명당 (점수 순)
- 페이즈 4~5 핫스팟 (참고용, 살아남음 신호)
"""
import json, sys, math
from collections import defaultdict
from pathlib import Path

import numpy as np
from sklearn.cluster import DBSCAN

sys.path.insert(0, str(Path(__file__).parent))


def detect_cities(p1_markers: list[dict], eps: float = 0.018, min_samples: int = 25) -> list[dict]:
    """페이즈 1 마커 클러스터링으로 대도시 자동 검출.
    eps=0.018 (144m) — 진짜 대도시 한 권역 단위 (포친키/야스나야 등).
    min_samples=25 — 대도시에 25+ 마커 (페이즈 1당 평균 600+ 마커).
    r 고정 (0.04 = 320m) — 대도시 영향권."""
    if not p1_markers:
        return []
    coords = np.array([[m['gx'], m['gy']] for m in p1_markers])
    db = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
    labels = db.labels_

    cities = []
    for label in set(labels):
        if label == -1: continue
        pts = coords[labels == label]
        cities.append({
            'cx': float(pts[:, 0].mean()),
            'cy': float(pts[:, 1].mean()),
            'r': 0.040,  # 320m — 대도시 영향권 (PUBG 평균 도시 사이즈)
            'marker_count': int(len(pts)),
        })
    cities.sort(key=lambda c: -c['marker_count'])
    return cities


def in_city(gx: float, gy: float, cities: list[dict]) -> bool:
    for c in cities:
        d = math.sqrt((gx - c['cx']) ** 2 + (gy - c['cy']) ** 2)
        if d <= c['r']: return True
    return False


def myungdang_score(markers: list[dict], zones_by_match: dict,
                     cities: list[dict], phase_focus: list[int]) -> list[dict]:
    """진짜 명당 점수 알고리즘.

    각 마커 점수 = (자기장 안) × (1 - dist_to_center/r) × log(매치다양성+1)
    - 자기장 가장자리 (외곽 버티기) → 점수 ↓
    - 자기장 중심 → 점수 ↑
    - 대도시 안 → 제외
    """
    # 마커 → 좌표 양자화 (0.015 격자 = 120m, 클러스터링 단위)
    QUANT = 0.015
    buckets = defaultdict(lambda: {'markers': [], 'matches': set(), 'score_sum': 0.0, 'gx_sum': 0.0, 'gy_sum': 0.0, 'n': 0})

    for m in markers:
        if m['phase'] not in phase_focus: continue
        if in_city(m['gx'], m['gy'], cities): continue  # 대도시 제외

        # 자기장 안 여부 + 중심 거리
        zone_info = zones_by_match.get(m['source'], {}).get(m['phase'])
        if not zone_info: continue  # 자기장 정보 없으면 제외
        zcx, zcy, zr = zone_info['cx_game'], zone_info['cy_game'], zone_info['r_game']
        dist = math.sqrt((m['gx'] - zcx) ** 2 + (m['gy'] - zcy) ** 2)
        if dist > zr: continue  # 자기장 밖 (외곽 버티기 가능성, 일단 제외)

        # 자기장 중심 가까울수록 점수 ↑ (1 - dist/r)
        center_bonus = 1.0 - (dist / zr) if zr > 0 else 0.5

        bx = round(m['gx'] / QUANT) * QUANT
        by = round(m['gy'] / QUANT) * QUANT
        key = (round(bx, 4), round(by, 4))
        b = buckets[key]
        b['markers'].append(m)
        b['matches'].add(m['source'])
        b['score_sum'] += center_bonus
        b['gx_sum'] += m['gx']
        b['gy_sum'] += m['gy']
        b['n'] += 1

    hotspots = []
    for (bx, by), b in buckets.items():
        if len(b['matches']) < 2: continue  # 최소 2매치 공통
        avg_center_bonus = b['score_sum'] / b['n']
        match_div = math.log(len(b['matches']) + 1)
        # 최종 점수 = 자기장 중심 가중 평균 × 매치 다양성 × sqrt(마커 수)
        score = avg_center_bonus * match_div * math.sqrt(b['n'])
        hotspots.append({
            'gx': round(b['gx_sum'] / b['n'], 4),
            'gy': round(b['gy_sum'] / b['n'], 4),
            'score': round(score, 3),
            'marker_count': b['n'],
            'match_count': len(b['matches']),
            'matches': sorted(b['matches']),
            'avg_center_bonus': round(avg_center_bonus, 3),
        })
    hotspots.sort(key=lambda h: -h['score'])
    return hotspots


def build_zones_by_match(result_dirs: list[str]) -> dict:
    """매치별 페이즈별 자기장 정보 (gx, gy, r_game) 평균 인덱스.
    같은 매치+페이즈 여러 시점 → 평균 사용 (자기장 안정화)."""
    import glob
    PUBG_PHASE_RADII = [0.24474, 0.13461, 0.07403, 0.04072, 0.02036, 0.01018, 0.00509, 0.00254]
    raw = defaultdict(lambda: defaultdict(list))  # {match: {phase: [(gx, gy), ...]}}
    for rd in result_dirs:
        for p in glob.glob(f"{rd}/*/result.json") + glob.glob(f"{rd}/result.json"):
            try:
                r = json.load(open(p))
            except: continue
            src_dir = Path(p).parent.name
            for z in r.get('zones_game') or []:
                phase = z.get('phase')
                if not phase: continue
                game = z.get('game')
                if not game: continue
                src = f"{src_dir}_m{z['match']}"
                raw[src][phase].append((game[0], game[1]))

    by_match = defaultdict(dict)
    for src, phases in raw.items():
        for phase, coords in phases.items():
            gxs = [c[0] for c in coords]
            gys = [c[1] for c in coords]
            by_match[src][phase] = {
                'cx_game': sum(gxs) / len(gxs),
                'cy_game': sum(gys) / len(gys),
                'r_game': PUBG_PHASE_RADII[phase - 1],
                'samples': len(coords),
            }
    return by_match


def main(dataset_path: str, result_dirs: list[str], out_path: str):
    ds = json.load(open(dataset_path))
    markers = ds['markers']

    # 1. 대도시 자동 검출 (페이즈 1)
    p1_markers = [m for m in markers if m['phase'] == 1]
    print(f"=== 페이즈 1 대도시 자동 검출 ({len(p1_markers)} 마커) ===")
    cities = detect_cities(p1_markers)
    print(f"검출된 대도시 {len(cities)}곳:")
    for i, c in enumerate(cities, 1):
        print(f"  {i}. ({c['cx']:.3f}, {c['cy']:.3f}) r={c['r']:.3f} ({c['marker_count']} 마커)")

    # 2. 매치별 자기장 정보 인덱스
    zones_by_match = build_zones_by_match(result_dirs)
    print(f"\n매치 자기장 인덱스: {len(zones_by_match)} 매치")

    # 3. 페이즈 2~3 (의도적 자리잡기)
    print(f"\n=== 페이즈 2~3 진짜 명당 분석 (대도시 제외 + 자기장 안 + 중심 가까이) ===")
    md_23 = myungdang_score(markers, zones_by_match, cities, phase_focus=[2, 3])
    print(f"명당 후보 {len(md_23)}곳 (매치 ≥2)")
    print(f"Top 15 (자기장 중심 가까이 + 매치 다양성):")
    for h in md_23[:15]:
        print(f"  ({h['gx']:.3f},{h['gy']:.3f}) score={h['score']:6.2f} | "
              f"매치={h['match_count']:2d} 마커={h['marker_count']:3d} 중심보너스={h['avg_center_bonus']:.2f}")

    # 4. 페이즈 4 (살아남음 신호, 참고)
    print(f"\n=== 페이즈 4 (참고: 살아남은 위치) ===")
    md_4 = myungdang_score(markers, zones_by_match, cities, phase_focus=[4])
    print(f"후보 {len(md_4)}곳, Top 5:")
    for h in md_4[:5]:
        print(f"  ({h['gx']:.3f},{h['gy']:.3f}) score={h['score']:6.2f} | 매치={h['match_count']} 마커={h['marker_count']}")

    out = {
        'cities': cities,
        'myungdang_phase23': md_23,
        'survivor_phase4': md_4,
        'meta': {
            'phase_focus': [2, 3],
            'algorithm': '대도시 제외 + 자기장 안 + 중심 거리 보너스 + 매치 다양성',
            'total_p2_3_markers': sum(1 for m in markers if m['phase'] in [2, 3]),
        },
    }
    json.dump(out, open(out_path, 'w'), indent=2, default=str)
    print(f"\n→ {out_path}")
    return out


if __name__ == "__main__":
    dataset = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/ml_dataset_v4.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pub34/myungdang_v1.json"
    dirs = ["/tmp/pub34/sanity", "/tmp/pub34/yETU_v2", "/tmp/pub34/batch_extra", "/tmp/pub34/batch_extra2"]
    main(dataset, dirs, out)
