"""추가 10 영상 v2 — QUALIFIERS + 마스터즈 + RACE (PWS 채널)."""
import os, json, shutil
from pathlib import Path

import pipeline
import clustering

EXTRA_VIDEOS = [
    # QUALIFIERS CUP 2026 (5)
    {'id': '87nxIt1BIz0', 'title': '2026 PWS QUALIFIERS WEEK 5'},
    {'id': 'ZKc3gs-ZOEs', 'title': '2026 PWS QUALIFIERS WEEK 4'},
    {'id': '4EvDyQxXzME', 'title': '2026 PWS QUALIFIERS WEEK 3'},
    {'id': 'aVAHHdKaO6Q', 'title': '2026 PWS QUALIFIERS WEEK 2'},
    {'id': '4RiGqdP32BY', 'title': '2026 PWS QUALIFIERS WEEK 1'},
    # 마스터즈 인비테이셔널 (3)
    {'id': 'EMbiNcDkgno', 'title': 'PUBG PLAYERS TOUR 마스터즈 DAY 3'},
    {'id': 'PGKV9ZS_cxw', 'title': 'PUBG PLAYERS TOUR 마스터즈 DAY 2'},
    {'id': 'dzFksHJh7tk', 'title': 'PUBG PLAYERS TOUR 마스터즈 DAY 1'},
    # 2026 RACE PGS PRELUDE (2)
    {'id': 'jY9tWvygGnc', 'title': '2026 PGS PRELUDE RACE DAY 4'},
    {'id': 'R_mdj32KD3Q', 'title': '2026 PGS PRELUDE RACE DAY 3'},
]


def batch_extra(out_dir: str = "/tmp/pub34/batch_extra2") -> dict:
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
                m['global_match'] = f"extra2-{i:02d}_m{m['match']}"
                all_markers.append(m)
            all_results.append({'video': v, 'result': result})
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
    hotspots = clustering.cluster_hotspots(coords_marker, eps=0.025, min_samples=5)
    print(f"핫스팟: {len(hotspots)}")
    for h in hotspots[:25]:
        print(f"  ({h['gx']:.3f},{h['gy']:.3f}) tier={h['tier']} count={h['count']} matches={len(h['matches'])}")

    out = {'videos': len(all_results), 'markers': len(all_markers), 'hotspots': hotspots,
           'results': [{'video_id': r['video']['id'], 'title': r['video']['title'],
                        'matches': r['result'].get('matches', []),
                        'n_markers': len(r['result'].get('markers_game', []))}
                       for r in all_results]}
    json.dump(out, open(f"{out_dir}/batch_extra2_summary.json", 'w'), indent=2, default=str)
    print(f"→ {out_dir}/batch_extra2_summary.json")
    return out


if __name__ == "__main__":
    batch_extra()
