"""ML 학습용 데이터셋 export.

PUB-35: 영상 분석 결과를 ML 모델 학습 입력 형태로 정리.

데이터 구조:
- 페이즈 1 마커: 진짜 명당 위치 (팀이 자유롭게 선택, 명당 학습 시드)
- 페이즈 2~5 마커: 자기장 강제 위치 (자기장 분포 학습)
- 자기장 중심: PUBG 자기장 형성 패턴 (별도 분포)

활용:
- location-service ERANGEL_PRO 시드 자동 갱신 (페이즈 1만)
- ML 모델 학습 (페이즈별 가중치, 자기장 조건부 명당)
"""
import os, json, glob
from collections import defaultdict
from pathlib import Path

import clustering


def collect_results(*result_dirs: str) -> list[dict]:
    """여러 work_dir에서 result.json 모아옴."""
    results = []
    for rd in result_dirs:
        for path in glob.glob(f"{rd}/*/result.json") + glob.glob(f"{rd}/result.json"):
            try:
                r = json.load(open(path))
                r['_source_path'] = path
                results.append(r)
            except Exception as e:
                print(f"skip {path}: {e}")
    return results


def filter_by_map(results: list[dict], target_map: str = 'erangel',
                   include_unknown: bool = True) -> list[dict]:
    """매치별 맵 분류에서 target_map 또는 unknown 매치 마커만 추출."""
    filtered = []
    for r in results:
        map_by_match = {}
        for mm in r.get('match_maps') or []:
            map_by_match[mm['match']] = mm['map']
        src = Path(r['_source_path']).parent.name
        for m in r.get('markers_game', []):
            mmap = map_by_match.get(m['match'], 'unknown')
            if mmap == target_map or (include_unknown and mmap == 'unknown'):
                m2 = dict(m)
                m2['source'] = f"{src}_m{m['match']}"
                m2['map'] = mmap
                filtered.append(m2)
    return filtered


def hotspots_by_phase(markers: list[dict], eps: float = 0.015,
                      min_samples_by_phase: dict[int, int] | None = None) -> dict[int, list[dict]]:
    """페이즈별 분리 클러스터링.

    페이즈 1 명당 = 진짜 명당 (자유 선택), 신뢰도 높음.
    페이즈 2~5 = 자기장 안 강제 위치, 별도 의미.

    eps=0.015 (120m) — 도시 구역/능선 봉우리/건물군 단위. 실험으로 확정 (eps_experiment 참고).
    """
    if min_samples_by_phase is None:
        min_samples_by_phase = {1: 8, 2: 8, 3: 8, 4: 6, 5: 5}

    by_phase = defaultdict(list)
    for m in markers:
        by_phase[m['phase']].append(m)

    result = {}
    for phase, p_markers in by_phase.items():
        for m in p_markers:
            m['match'] = m['source']  # clustering API 호환
        min_s = min_samples_by_phase.get(phase, 10)
        hotspots = clustering.cluster_hotspots(p_markers, eps=eps, min_samples=min_s)
        result[phase] = hotspots
    return result


def export_dataset(result_dirs: list[str], out_path: str,
                    target_map: str = 'erangel') -> dict:
    """전체 데이터셋 export. ML 학습 + seed 갱신 입력."""
    results = collect_results(*result_dirs)
    markers = filter_by_map(results, target_map=target_map)
    phase_hotspots = hotspots_by_phase(markers)

    # 메타데이터
    metadata = {
        'target_map': target_map,
        'n_videos': len(results),
        'n_markers': len(markers),
        'markers_by_phase': {str(p): sum(1 for m in markers if m['phase'] == p) for p in [1, 2, 3, 4, 5]},
        'hotspots_by_phase_count': {str(p): len(h) for p, h in phase_hotspots.items()},
    }

    # 영상별 통계
    by_video = defaultdict(int)
    for m in markers:
        src = m['source'].rsplit('_m', 1)[0]
        by_video[src] += 1
    metadata['markers_by_video'] = dict(by_video)

    dataset = {
        'metadata': metadata,
        'markers': markers,
        'hotspots_by_phase': {str(p): h for p, h in phase_hotspots.items()},
    }

    os.makedirs(Path(out_path).parent, exist_ok=True)
    json.dump(dataset, open(out_path, 'w'), indent=2, default=str)
    return dataset


if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/ml_dataset_erangel.json"
    dirs = sys.argv[2:] if len(sys.argv) > 2 else [
        "/tmp/pub34/sanity",
        "/tmp/pub34/yETU_v2",
        "/tmp/pub34/batch_extra",
    ]
    ds = export_dataset(dirs, out)
    print(f"=== ML 데이터셋 export ===")
    print(json.dumps(ds['metadata'], indent=2, ensure_ascii=False))
    print(f"\n핫스팟 by phase:")
    for p in sorted(ds['hotspots_by_phase'].keys()):
        hs = ds['hotspots_by_phase'][p]
        print(f"  P{p}: {len(hs)}개", [f"({h['gx']:.2f},{h['gy']:.2f},{h['tier']})" for h in hs[:3]])
    print(f"\n→ {out}")
