"""DBSCAN eps 변화 실험 — 페이즈 1 명당 클러스터 정밀도 검증.

PUB-35: 사용자 통찰 "도시 vs 능선/조그만 건물 구분" 검증.

결과 (5 영상 1222 마커 기준):
  eps=0.040 (320m): 18 핫스팟 — 너무 뭉뜽그림
  eps=0.025 (200m): 37 핫스팟 — 도시 권역 단위
  eps=0.015 (120m): 48 핫스팟 — 도시 구역/능선/건물군 단위 ★ 채택
  eps=0.010 (80m):  39 핫스팟 — 단일 건물 단위 (S tier 분산)
  eps=0.008 (64m):  32 핫스팟 — 너무 작아 S tier 신뢰도 ↓

결론: eps=0.015 가 sweet spot. 200m 도시 권역과 80m 건물 단위 사이.
PUBG 게임에서 한 명당 사용권은 보통 100~150m 반경.
"""
import json, sys
sys.path.insert(0, ".")
import clustering


def run_experiment(dataset_path: str, phase: int = 1):
    d = json.load(open(dataset_path))
    markers = [m for m in d['markers'] if m['phase'] == phase]
    for m in markers:
        m['match'] = m['source']

    print(f"=== 페이즈 {phase} 마커 {len(markers)}개 ===")
    print(f"\n{'eps':>8} {'반경':>8} {'핫스팟':>6} {'S':>3} {'A':>3} {'B':>3}")
    for eps in [0.040, 0.025, 0.015, 0.010, 0.008]:
        hs = clustering.cluster_hotspots(markers, eps=eps, min_samples=8)
        s = sum(1 for h in hs if h['tier'] == 'S')
        a = sum(1 for h in hs if h['tier'] == 'A')
        b = sum(1 for h in hs if h['tier'] == 'B')
        print(f"{eps:>8.3f} {eps*8000:>6.0f}m  {len(hs):>5} {s:>3} {a:>3} {b:>3}")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/ml_dataset_v2.json"
    run_experiment(path)
