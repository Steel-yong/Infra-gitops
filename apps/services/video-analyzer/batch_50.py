"""50개 영상 자동 배치 — 사용자 요청: 더 많은 데이터로 진짜 명당 패턴 학습."""
import os, json, shutil
from pathlib import Path

import pipeline
import download

CHANNEL = "https://www.youtube.com/@pubgesportskr"

# 이미 처리한 영상 (제외)
ALREADY_PROCESSED = {
    'yETUqntffvc', 'tp8tZdbZeDg', 'RC-L9Dk5ToI', 'Z3nPy8OlTU8',
    # batch_more (PGS/PGC)
    'RMcQHKwMwwg', 'LrokJG_bUqY', 'gY0ZirnCLQg', 'KDQdrCzRFhU',
    'EXm6t_oWn7k', 'bVBXCuw5Wok', 'hsS2o61esls', 'jXLuXTEAw7o',
    'VJJmGegd8aM', '0R_wvT6id94',
    # batch_more_v2 (QUALIFIERS/마스터즈/RACE)
    '87nxIt1BIz0', 'ZKc3gs-ZOEs', '4EvDyQxXzME', 'aVAHHdKaO6Q',
    '4RiGqdP32BY', 'EMbiNcDkgno', 'PGKV9ZS_cxw', 'dzFksHJh7tk',
    'jY9tWvygGnc', 'R_mdj32KD3Q',
}


def batch_50(out_dir: str = "/tmp/pub34/batch_50", target: int = 30):
    """채널에서 (MAP) 영상 목록 가져와 미처리 영상 N개 자동 분석."""
    os.makedirs(out_dir, exist_ok=True)

    print(f"=== PUBG Esports KR (MAP) 영상 목록 조회 (limit 100) ===")
    try:
        videos = download.channel_map_videos(CHANNEL, limit=100)
    except Exception as e:
        print(f"❌ 채널 조회 실패: {e}")
        return {}
    print(f"검색된 (MAP) 영상: {len(videos)}개")

    # 미처리만 필터
    new_videos = [v for v in videos if v['id'] not in ALREADY_PROCESSED][:target]
    print(f"미처리 영상 {len(new_videos)}개 분석 시작:\n")
    for v in new_videos:
        print(f"  - {v['id']}: {v['title']}")

    all_markers = []
    summary = []
    for i, v in enumerate(new_videos, 1):
        vid = v['id']
        work = f"{out_dir}/v{i:02d}_{vid}"
        url = f"https://www.youtube.com/watch?v={vid}"
        print(f"\n[{i}/{len(new_videos)}] {v['title']}")
        try:
            r = pipeline.analyze_video(url, work)
            if 'error' in r:
                print(f"  ❌ {r['error']}")
                continue
            n_match = len(r.get('matches', []))
            n_mark = len(r.get('markers_game', []))
            print(f"  ✓ 매치 {n_match}, 마커 {n_mark}")
            for m in r.get('markers_game', []):
                m['video_id'] = vid
                m['global_match'] = f"b50_{i:02d}_m{m['match']}"
                all_markers.append(m)
            summary.append({
                'video_id': vid, 'title': v['title'],
                'matches': r.get('matches', []), 'n_markers': n_mark,
            })
            # 디스크 절약
            for clean in [f"{work}/video.mp4", f"{work}/frames"]:
                if Path(clean).exists():
                    if Path(clean).is_dir(): shutil.rmtree(clean)
                    else: os.remove(clean)
        except Exception as e:
            print(f"  ❌ exception: {e}")

    print(f"\n=== 처리 완료 ({len(summary)}/{len(new_videos)} 영상, 마커 {len(all_markers)}) ===")
    out = {'videos': len(summary), 'markers': len(all_markers), 'summary': summary}
    json.dump(out, open(f"{out_dir}/batch_50_summary.json", 'w'), indent=2, default=str)
    print(f"→ {out_dir}/batch_50_summary.json")
    return out


if __name__ == "__main__":
    batch_50()
