"""통합 파이프라인 — URL 받아 자기장+마커+클러스터링 전체 실행.
사용:
    from pipeline import analyze_video
    result = analyze_video('https://www.youtube.com/watch?v=...', work_dir='/tmp/pub34/run_X')
"""
import os, json, glob
from pathlib import Path

import cv2

import download
import frames
import match_classifier
import zone_detector
import marker_extractor
import grid_ocr
import clustering


def is_phase1(sec: int, match_start_minute: int, window_min: int = 3) -> bool:
    """매치 시작 + 0~3분 = 페이즈 1 시점 (zoom ≈ 1)."""
    return match_start_minute * 60 <= sec <= (match_start_minute + window_min) * 60


def analyze_video(url: str, work_dir: str, transform=grid_ocr.DEFAULT_TRANSFORM_ERANGEL,
                  reader=None) -> dict:
    """영상 1개 통합 분석. 반환: {matches, markers_game, hotspots, ...}"""
    os.makedirs(work_dir, exist_ok=True)
    video_path = f"{work_dir}/video.mp4"
    frames_dir = f"{work_dir}/frames"

    # 1. 다운로드 (없으면)
    if not Path(video_path).exists():
        ok = download.download(url, f"{work_dir}/video.%(ext)s", purpose='detect')
        if not ok: return {'error': 'download_failed'}

    # 2. 프레임 추출
    n_frames = frames.extract_frames(video_path, frames_dir, interval_sec=30)
    if n_frames < 10:
        return {'error': 'too_few_frames', 'n': n_frames}

    frame_paths = sorted(glob.glob(f"{frames_dir}/f_*.jpg"))

    # 3. 매치 식별
    matches = match_classifier.find_matches(frame_paths)

    # 4. 각 프레임 분석 (페이즈 1만 변환)
    x_t, y_t = transform
    markers_game = []
    zones_game = []
    for i, fp in enumerate(frame_paths):
        sec = (i + 1) * 30
        match_idx = None
        for j, (s, e) in enumerate(matches, 1):
            if s <= sec // 60 <= e:
                match_idx = j; break
        if not match_idx: continue

        img = cv2.imread(fp)
        if img is None: continue
        zone = zone_detector.detect_zone(img)
        if not zone: continue

        # zone 게임 좌표 (페이즈 1만)
        match_start = matches[match_idx-1][0]
        p1 = is_phase1(sec, match_start)
        z_game = None
        if p1:
            gx, gy = grid_ocr.apply_transform(zone['x_screen'], zone['y_screen'], x_t, y_t)
            z_game = (round(gx, 4), round(gy, 4))
        zones_game.append({
            'sec': sec, 'match': match_idx,
            'screen': (zone['x_screen'], zone['y_screen']),
            'game': z_game, 'r_screen': zone['r_screen'], 'phase1': p1,
        })

        if not p1: continue

        # 마커 변환
        markers = marker_extractor.extract_markers(img, zone)
        for m in markers:
            gx, gy = grid_ocr.apply_transform(m['cx_norm'], m['cy_norm'], x_t, y_t)
            if 0 <= gx <= 1 and 0 <= gy <= 1:
                markers_game.append({
                    'sec': sec, 'match': match_idx,
                    'gx': round(gx, 4), 'gy': round(gy, 4), 'rgb': m['rgb'],
                })

    hotspots = clustering.cluster_hotspots(markers_game)

    result = {
        'url': url,
        'matches': matches,
        'markers_game': markers_game,
        'zones_game': zones_game,
        'hotspots': hotspots,
    }
    json.dump(result, open(f"{work_dir}/result.json", 'w'), indent=2, default=str)
    return result


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=yETUqntffvc"
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pub34/run_default"
    r = analyze_video(url, work)
    print(f"매치 {len(r.get('matches', []))}, 마커 {len(r.get('markers_game', []))}, 핫스팟 {len(r.get('hotspots', []))}")
