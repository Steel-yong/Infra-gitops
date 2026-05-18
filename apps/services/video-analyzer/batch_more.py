"""15 PWS + 10 추가 시즌 영상 배치. PGS 8 + PGC 2 = 10 추가."""
import os, json, shutil
from pathlib import Path

import pipeline
import clustering

# 사용자 명령: 15 PWS + 10 추가 = 총 25 영상
# 추가 10: 2026 PGS (8개 최신 토너먼트) + 2025 PGC (2개 글로벌 그랜드)
EXTRA_VIDEOS = [
    # 2026 PGS 1~3 (다른 토너먼트, 최신)
    {'id': 'RMcQHKwMwwg', 'title': '2026 PGS 3 GRAND FINALS DAY 2'},
    {'id': 'LrokJG_bUqY', 'title': '2026 PGS 3 GRAND FINALS DAY 1'},
    {'id': 'gY0ZirnCLQg', 'title': '2026 PGS 2 FINAL STAGE DAY 2'},
    {'id': 'KDQdrCzRFhU', 'title': '2026 PGS 2 FINAL STAGE DAY 1'},
    {'id': 'EXm6t_oWn7k', 'title': '2026 PGS 1 FINAL STAGE DAY 2'},
    {'id': 'bVBXCuw5Wok', 'title': '2026 PGS 1 FINAL STAGE DAY 1'},
    {'id': 'hsS2o61esls', 'title': '2026 PGS 2 WINNERS STAGE'},
    {'id': 'jXLuXTEAw7o', 'title': '2026 PGS 1 WINNERS STAGE'},
    # PGC 2025 (글로벌 그랜드)
    {'id': 'VJJmGegd8aM', 'title': 'PGC 2025 GRAND FINALS DAY 3'},
    {'id': '0R_wvT6id94', 'title': 'PGC 2025 GRAND FINALS DAY 2'},
]


def batch_extra(out_dir: str = "/tmp/pub34/batch_extra") -> dict:
    os.makedirs(out_dir, exist_ok=True)
    all_markers = []
    all_results = []
    for i, v in enumerate(EXTRA_VIDEOS, 1):
        work = f"{out_dir}/v{i:02d}_{v['id']}"
        url = f"https://www.youtube.com/watch?v={v['id']}"
        print(f"\n[{i}/{len(EXTRA_VIDEOS)}] {v['title']}")
        try:
            result = pipeline.analyze_video(url, work)
            if 'error' in result:
                print(f"  ❌ {result['error']}")
                continue
            print(f"  매치 {len(result.get('matches', []))}, 마커 {len(result.get('markers_game', []))}")
            for m in result.get('markers_game', []):
                m['video_id'] = v['id']
                m['global_match'] = f"extra{i:02d}_m{m['match']}"
                all_markers.append(m)
            all_results.append({'video': v, 'result': result})
            # 디스크 절약
            video_file = f"{work}/video.mp4"
            if Path(video_file).exists():
                os.remove(video_file)
            frames_dir = f"{work}/frames"
            if Path(frames_dir).exists():
                shutil.rmtree(frames_dir)
        except Exception as e:
            print(f"  ❌ exception: {e}")
            continue

    print(f"\n=== 통합 클러스터링 ({len(all_markers)} 마커) ===")
    coords_marker = [{'gx': m['gx'], 'gy': m['gy'], 'match': m['global_match']} for m in all_markers]
    hotspots = clustering.cluster_hotspots(coords_marker, eps=0.025, min_samples=10)
    print(f"핫스팟: {len(hotspots)}")
    for h in hotspots[:20]:
        print(f"  ({h['gx']:.3f},{h['gy']:.3f}) tier={h['tier']} count={h['count']} matches={len(h['matches'])}")

    out = {'videos': len(all_results), 'markers': len(all_markers), 'hotspots': hotspots,
           'results': [{'video_id': r['video']['id'], 'title': r['video']['title'],
                        'matches': r['result'].get('matches', []),
                        'n_markers': len(r['result'].get('markers_game', []))}
                       for r in all_results]}
    json.dump(out, open(f"{out_dir}/batch_extra_summary.json", 'w'), indent=2, default=str)
    print(f"→ {out_dir}/batch_extra_summary.json")
    return out


if __name__ == "__main__":
    batch_extra()
