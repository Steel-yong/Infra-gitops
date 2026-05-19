"""다중 알고리즘 위치 분석 — 사용자 통찰 "여러 방법 다 써봐" 반영.

방법:
1. DBSCAN 클러스터링 (페이즈별) — ml_export 기본
2. KMeans 고정 K개 명당 (PUBG 게임에 K=60 명당 추정)
3. 16×16 격자 밀도 히트맵 — 도시 vs 산악 구분
4. 자기장 중심 분포 — 매치별 자기장이 어디에 자주 형성되는지
5. 매치 다양성 가중치 — 매치 수 × 마커 수 = 진짜 신뢰도

활용:
- 단일 명당 (DBSCAN/KMeans) — location-service seed
- 격자 히트맵 — 사용자 시각 검증
- 자기장 분포 — 자기장 예측 ML 입력
"""
import json, sys, math
from collections import defaultdict, Counter
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans

sys.path.insert(0, str(Path(__file__).parent))
import clustering


def kmeans_hotspots(markers: list[dict], k: int = 60, phase: int = 1) -> list[dict]:
    """KMeans 고정 K개 명당. PUBG 에란겔 명당 추정 60곳."""
    p_markers = [m for m in markers if m['phase'] == phase]
    if len(p_markers) < k:
        return []
    coords = np.array([[m['gx'], m['gy']] for m in p_markers])
    km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(coords)
    centers = km.cluster_centers_

    # 각 클러스터별 매치 카운트
    hotspots = []
    for i, c in enumerate(centers):
        cluster_markers = [m for j, m in enumerate(p_markers) if km.labels_[j] == i]
        matches = set(m['source'] for m in cluster_markers)
        n_matches = len(matches)
        tier = 'S' if n_matches >= 5 else ('A' if n_matches >= 3 else 'B')
        hotspots.append({
            'gx': round(float(c[0]), 4),
            'gy': round(float(c[1]), 4),
            'count': len(cluster_markers),
            'matches': sorted(matches),
            'tier': tier,
        })
    hotspots.sort(key=lambda h: (-len(h['matches']), -h['count']))
    return hotspots


def grid_density(markers: list[dict], grid_size: int = 16, phase: int = 1) -> list[list[dict]]:
    """grid_size × grid_size 격자에 마커 밀도. PUBG 8km × 8km → 500m × 500m 격자."""
    p_markers = [m for m in markers if m['phase'] == phase]
    grid = [[{'count': 0, 'matches': set()} for _ in range(grid_size)] for _ in range(grid_size)]
    for m in p_markers:
        gx, gy = m['gx'], m['gy']
        if not (0 <= gx <= 1 and 0 <= gy <= 1): continue
        ix = min(int(gx * grid_size), grid_size - 1)
        iy = min(int(gy * grid_size), grid_size - 1)
        grid[iy][ix]['count'] += 1
        grid[iy][ix]['matches'].add(m['source'])
    # set → list 변환 (JSON 직렬화)
    return [[{'count': cell['count'], 'matches': len(cell['matches'])} for cell in row] for row in grid]


def zone_center_distribution(results: list[dict]) -> dict[int, list[dict]]:
    """페이즈별 자기장 중심 분포 — ML 자기장 예측 입력."""
    by_phase = defaultdict(list)
    for r in results:
        for z in r.get('zones_game', []):
            game = z.get('game')
            if not game: continue
            by_phase[z['phase']].append({
                'gx': game[0], 'gy': game[1], 'r_screen': z.get('r_screen'),
                'sec': z['sec'], 'match': z['match'],
            })
    return {str(p): zones for p, zones in sorted(by_phase.items())}


def weighted_hotspot_score(hotspots: list[dict]) -> list[dict]:
    """매치 다양성 × 마커 수 가중치 — 진짜 신뢰도.
    score = log(매치수+1) × sqrt(마커수). 매치 다양성에 가중치 큼."""
    for h in hotspots:
        n_matches = len(h['matches'])
        h['score'] = round(math.log(n_matches + 1) * math.sqrt(h['count']), 2)
    return sorted(hotspots, key=lambda h: -h['score'])


def comprehensive_analysis(dataset_path: str, result_dirs: list[str], out_path: str):
    """다중 알고리즘 종합 분석."""
    ds = json.load(open(dataset_path))
    markers = ds['markers']

    # 1. KMeans K=60
    print("=== KMeans K=60 (페이즈 1) ===")
    km_hotspots = kmeans_hotspots(markers, k=60, phase=1)
    print(f"핫스팟 {len(km_hotspots)} | S/A/B = "
          f"{sum(1 for h in km_hotspots if h['tier']=='S')}/"
          f"{sum(1 for h in km_hotspots if h['tier']=='A')}/"
          f"{sum(1 for h in km_hotspots if h['tier']=='B')}")

    # 2. 격자 밀도
    print("\n=== 격자 밀도 (16×16, 페이즈 1) ===")
    grid = grid_density(markers, grid_size=16, phase=1)
    flat = [(i, j, grid[i][j]['count'], grid[i][j]['matches'])
            for i in range(16) for j in range(16) if grid[i][j]['count'] > 0]
    flat.sort(key=lambda x: -x[2])
    print("Top 10 격자 (행, 열, 마커, 매치):")
    for i, j, c, m in flat[:10]:
        gx, gy = (j + 0.5) / 16, (i + 0.5) / 16
        print(f"  격자[{i},{j}] = (gx={gx:.3f}, gy={gy:.3f}) — {c}마커 {m}매치")

    # 3. 자기장 중심 분포
    print("\n=== 자기장 중심 분포 ===")
    import glob
    results = []
    for rd in result_dirs:
        for p in glob.glob(f"{rd}/*/result.json") + glob.glob(f"{rd}/result.json"):
            try:
                results.append(json.load(open(p)))
            except: pass
    zone_dist = zone_center_distribution(results)
    for p, zs in zone_dist.items():
        if zs:
            gxs = [z['gx'] for z in zs]
            gys = [z['gy'] for z in zs]
            print(f"  P{p}: {len(zs)}개 자기장 중심 | gx [{min(gxs):.2f}~{max(gxs):.2f}] avg={np.mean(gxs):.3f} | gy [{min(gys):.2f}~{max(gys):.2f}] avg={np.mean(gys):.3f}")

    # 4. 가중 점수 (DBSCAN 페이즈 1)
    print("\n=== 가중 점수 (DBSCAN 페이즈 1, score = log(매치+1)×sqrt(마커수)) ===")
    dbscan_hotspots = ds['hotspots_by_phase']['1']
    weighted = weighted_hotspot_score(dbscan_hotspots)
    print(f"Top 10 핫스팟 (가중 점수 순):")
    for h in weighted[:10]:
        print(f"  ({h['gx']:.3f},{h['gy']:.3f}) score={h['score']} tier={h['tier']} {len(h['matches'])}매치 {h['count']}마커")

    # 종합 export
    out = {
        'dataset_meta': ds['metadata'],
        'kmeans_k60': km_hotspots,
        'grid_density_16': grid,
        'zone_center_distribution': zone_dist,
        'dbscan_weighted': weighted,
    }
    json.dump(out, open(out_path, 'w'), indent=2, default=str)
    print(f"\n→ {out_path}")
    return out


if __name__ == "__main__":
    dataset = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/ml_dataset_v3.json"
    out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pub34/analysis_v3.json"
    dirs = ["/tmp/pub34/sanity", "/tmp/pub34/yETU_v2", "/tmp/pub34/weekly_test",
            "/tmp/pub34/batch_extra", "/tmp/pub34/batch_extra2"]
    comprehensive_analysis(dataset, dirs, out)
