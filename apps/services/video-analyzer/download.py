"""유튜브 영상 다운로드 — yt-dlp wrapper.
- format 134 (360p video-only, mp4 avc1): ffmpeg 후처리 없이 단일 파일.
- format 298 (720p): 자기장 검출 정확도 ↑.
- format 299 (1080p): 격자 라벨 OCR 정확도 ↑ (변환식 도출용).
"""
import subprocess, json, os
from pathlib import Path

# CPU 기반 ffmpeg-portable
FFMPEG = "/home/kim/.local/lib/python3.10/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"

FORMAT_BY_PURPOSE = {
    'detect': 134,   # 360p video-only — 자기장+마커 검출에 충분
    'analysis': 298, # 720p — 정확도 향상용
    'ocr': 299,      # 1080p — 격자 라벨 OCR용 (변환식 도출 1회만)
}

def video_info(url: str) -> dict:
    """yt-dlp --dump-json으로 메타데이터 추출."""
    result = subprocess.run(
        ['python3', '-m', 'yt_dlp', '--dump-json', '--no-warnings', '--no-playlist', url],
        capture_output=True, text=True, timeout=60
    )
    return json.loads(result.stdout)


def download(url: str, out_path: str, purpose: str = 'detect') -> bool:
    """purpose별 형식으로 다운로드. video-only이라 ffmpeg 후처리 안 함.
    fallback: 134 (360p mp4) → 18 (360p mp4+audio) → best[height<=480]"""
    fmt = FORMAT_BY_PURPOSE.get(purpose, 134)
    # 첫 시도: 정확한 format
    for try_fmt in [str(fmt), '18', 'best[height<=480][ext=mp4]', 'best[height<=480]']:
        cmd = ['python3', '-m', 'yt_dlp', '-f', try_fmt, '-o', out_path, url]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode == 0 and Path(out_path.replace('%(ext)s', 'mp4')).exists():
            return True
    return False


def channel_map_videos(channel_url: str, limit: int = 100) -> list[dict]:
    """채널의 (MAP) 키워드 영상 목록. 라이브/스트림 탭 우선."""
    import re
    cmd = ['python3', '-m', 'yt_dlp', '--flat-playlist', '--dump-json',
           '--playlist-end', str(limit), f'{channel_url}/streams']
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    videos = []
    for line in result.stdout.splitlines():
        if not line.strip(): continue
        try:
            d = json.loads(line)
            title = d.get('title', '')
            if re.search(r'\(MAP\)|MAP[\s\)]', title, re.IGNORECASE):
                videos.append({
                    'id': d.get('id'),
                    'title': title,
                    'duration': d.get('duration'),
                    'url': f"https://www.youtube.com/watch?v={d.get('id')}"
                })
        except json.JSONDecodeError:
            continue
    return videos
