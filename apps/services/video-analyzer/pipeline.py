"""통합 파이프라인 — URL 받아 자기장+마커+클러스터링 전체 실행.

PUB-34 v1: 페이즈 1 시점만 변환 (격자 OCR 가능 시점).
PUB-35 v2: 페이즈 1~5 시점 변환 (페이즈 2~5는 체인 변환).

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
import match_map_assigner
import phase_timing


def analyze_video(url: str, work_dir: str, transform=grid_ocr.DEFAULT_TRANSFORM_ERANGEL,
                  reader=None, max_phase: int = 5) -> dict:
    """영상 1개 통합 분석. 페이즈 1~max_phase 시점 마커 변환.

    Args:
        transform: 페이즈 1 격자 OCR 변환식 (DEFAULT 또는 영상별 도출).
        max_phase: 처리할 최대 페이즈 (기본 5 — 페이즈 5+ 자기장 작아 정밀도 낮음).

    Returns: {matches, markers_game, hotspots, phase_transforms, ...}
    """
    os.makedirs(work_dir, exist_ok=True)
    video_path = f"{work_dir}/video.mp4"
    frames_dir = f"{work_dir}/frames"

    # 1. 다운로드
    if not Path(video_path).exists():
        ok = download.download(url, f"{work_dir}/video.%(ext)s", purpose='detect')
        if not ok: return {'error': 'download_failed'}

    # 2. 프레임 추출 (30초 간격)
    interval_sec = 30
    n_frames = frames.extract_frames(video_path, frames_dir, interval_sec=interval_sec)
    if n_frames < 10:
        return {'error': 'too_few_frames', 'n': n_frames}

    frame_paths = sorted(glob.glob(f"{frames_dir}/f_*.jpg"))

    # 3. 매치 식별 — v2 인트로 색 → v4 자기장 그룹 → v5 자기장 반경 변화
    # PGS 영상 v2/v4가 6 매치를 1로 압축하는 케이스 → v5가 큰→작은 자기장 사이클로 정확히 분리
    matches = match_classifier.find_matches(frame_paths)
    if not matches or (len(matches) == 1 and matches[0][1] - matches[0][0] > 60):
        # 매치 0개 또는 1개로 영상 전체 압축됨 (PGS 패턴) → v5 시도
        v5_matches = match_classifier.find_matches_v5(frame_paths)
        if v5_matches and len(v5_matches) > len(matches):
            matches = v5_matches
        elif not matches:
            matches = match_classifier.find_matches_by_zone(frame_paths)

    # 3.5. 매치별 맵 분류
    match_maps = match_map_assigner.assign_match_maps(frame_paths, matches)

    # 4. 매치별 페이즈별 변환식 도출 → 모든 페이즈 1~max_phase 마커 변환
    markers_game = []
    zones_game = []
    phase_transforms = {}  # {match_idx: {phase: transform}}

    for match_idx, (s, e) in enumerate(matches, 1):
        match_start_sec = s * 60
        # 페이즈 1 변환식은 전달받은 transform 사용 (격자 OCR 결과)
        t_per_phase = {1: transform}
        phase_transforms[match_idx] = t_per_phase

        # 4.1 페이즈 2~max_phase 변환식 도출 (체인)
        for phase in range(2, max_phase + 1):
            sample_sec = match_start_sec + phase_timing.phase_sampling_sec(phase)
            frame_idx = sample_sec // interval_sec - 1  # 0-indexed
            if not (0 <= frame_idx < len(frame_paths)): continue

            img = cv2.imread(frame_paths[frame_idx])
            if img is None: continue
            zone = zone_detector.detect_zone(img)
            if not zone: continue

            prev_t = t_per_phase.get(phase - 1)
            if not prev_t: continue
            t_per_phase[phase] = grid_ocr.derive_transform_from_zone(zone, prev_t, phase)

        # 4.2 매치 프레임 전체에 대해 페이즈별 변환 적용
        for i, fp in enumerate(frame_paths):
            sec = (i + 1) * interval_sec
            if not (s <= sec // 60 <= e): continue

            sec_in_match = sec - match_start_sec
            phase = phase_timing.phase_at_sec(sec_in_match)
            if not phase or phase > max_phase: continue
            if phase not in t_per_phase: continue

            img = cv2.imread(fp)
            if img is None: continue
            zone = zone_detector.detect_zone(img)
            if not zone: continue

            x_t, y_t = t_per_phase[phase]
            zx_game, zy_game = grid_ocr.apply_transform(
                zone['x_screen'], zone['y_screen'], x_t, y_t,
            )
            zones_game.append({
                'sec': sec, 'match': match_idx, 'phase': phase,
                'screen': (zone['x_screen'], zone['y_screen']),
                'game': (round(zx_game, 4), round(zy_game, 4)),
                'r_screen': zone['r_screen'],
            })

            markers = marker_extractor.extract_markers(img, zone)
            for m in markers:
                gx, gy = grid_ocr.apply_transform(m['cx_norm'], m['cy_norm'], x_t, y_t)
                if 0 <= gx <= 1 and 0 <= gy <= 1:
                    markers_game.append({
                        'sec': sec, 'match': match_idx, 'phase': phase,
                        'gx': round(gx, 4), 'gy': round(gy, 4), 'rgb': m['rgb'],
                    })

    hotspots = clustering.cluster_hotspots(markers_game)

    result = {
        'url': url,
        'matches': matches,
        'match_maps': match_maps,
        'markers_game': markers_game,
        'zones_game': zones_game,
        'hotspots': hotspots,
        'phase_transforms': {
            str(m): {str(p): t for p, t in pt.items()}
            for m, pt in phase_transforms.items()
        },
        'max_phase': max_phase,
    }
    json.dump(result, open(f"{work_dir}/result.json", 'w'), indent=2, default=str)
    return result


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.youtube.com/watch?v=yETUqntffvc"
    work = sys.argv[2] if len(sys.argv) > 2 else "/tmp/pub34/run_default"
    r = analyze_video(url, work)
    matches = r.get('matches', [])
    markers = r.get('markers_game', [])
    by_phase = {}
    for m in markers:
        by_phase[m['phase']] = by_phase.get(m['phase'], 0) + 1
    print(f"매치 {len(matches)}, 마커 총 {len(markers)}, 핫스팟 {len(r.get('hotspots', []))}")
    print(f"페이즈별 마커: {dict(sorted(by_phase.items()))}")
