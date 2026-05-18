"""15개 PWS (MAP) 영상 배치 분석.
- 영상별 다운 → 분석 → 마커 게임 좌표 저장 → 영상 삭제 (디스크 절약)
- 모든 영상 결과 통합 → 단일 클러스터링 → 90+ 매치 데이터셋
"""
import os, json, glob, shutil
from pathlib import Path

import download
import pipeline
import clustering
import grid_ocr

CHANNEL = "https://www.youtube.com/@PUBGEsportsKR"


def batch_analyze(out_dir: str = "/tmp/pub34/batch", limit: int = 15) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    print("(MAP) 영상 목록 수집...")
    videos = download.channel_map_videos(CHANNEL, limit=100)
    print(f"  → {len(videos)}개 발견")

    all_markers = []
    all_results = []
    for i, v in enumerate(videos[:limit], 1):
        work = f"{out_dir}/v{i:02d}_{v['id']}"
        print(f"\n[{i}/{min(limit, len(videos))}] {v['title'][:60]} ({v['duration']/60:.0f}분)")
        try:
            result = pipeline.analyze_video(v['url'], work)
            if 'error' in result:
                print(f"  ❌ {result['error']}")
                continue
            print(f"  매치 {len(result.get('matches', []))}, 마커 {len(result.get('markers_game', []))}")
            # 영상별 매치 인덱스를 글로벌 인덱스로 (v1_match1, v1_match2 ...)
            for m in result.get('markers_game', []):
                m['video_id'] = v['id']
                m['global_match'] = f"v{i:02d}_m{m['match']}"
                all_markers.append(m)
            all_results.append({'video': v, 'result': result})
            # 영상 파일 삭제 (디스크 절약)
            video_file = f"{work}/video.mp4"
            if Path(video_file).exists():
                os.remove(video_file)
            # 프레임도 삭제 (결과 JSON만 보존)
            frames_dir = f"{work}/frames"
            if Path(frames_dir).exists():
                shutil.rmtree(frames_dir)
        except Exception as e:
            print(f"  ❌ exception: {e}")
            continue

    # 통합 클러스터링 — global_match 기준
    print(f"\n=== 통합 클러스터링 ({len(all_markers)} 마커, {sum(1 for _ in all_results)} 영상) ===")
    coords_marker = []
    for m in all_markers:
        coords_marker.append({'gx': m['gx'], 'gy': m['gy'], 'match': m['global_match'], 'video_id': m['video_id']})
    hotspots = clustering.cluster_hotspots(coords_marker, eps=0.025, min_samples=10)
    print(f"\n전체 핫스팟: {len(hotspots)}개")
    print(f"상위 20:")
    for h in hotspots[:20]:
        print(f"  ({h['gx']:.3f},{h['gy']:.3f}) tier={h['tier']} count={h['count']} matches={len(h['matches'])}")

    out = {'videos': len(all_results), 'markers': len(all_markers), 'hotspots': hotspots,
           'all_results': [{'video_id': r['video']['id'], 'title': r['video']['title'],
                            'matches': r['result'].get('matches', []),
                            'n_markers': len(r['result'].get('markers_game', []))}
                           for r in all_results]}
    json.dump(out, open(f"{out_dir}/batch_summary.json", 'w'), indent=2, default=str)
    print(f"\n→ {out_dir}/batch_summary.json")
    return out


if __name__ == "__main__":
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 15
    batch_analyze(limit=limit)
