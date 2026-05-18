"""영상 → 30초 간격 프레임 추출. ffmpeg-portable."""
import subprocess, os
from pathlib import Path

FFMPEG = "/home/kim/.local/lib/python3.10/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"


def extract_frames(video_path: str, out_dir: str, interval_sec: int = 30) -> int:
    """fps=1/interval_sec로 프레임 추출. 반환: 추출 프레임 수."""
    os.makedirs(out_dir, exist_ok=True)
    fps = f"1/{interval_sec}"
    pattern = f"{out_dir}/f_%05d.jpg"
    cmd = [FFMPEG, '-y', '-i', video_path, '-vf', f'fps={fps}', '-q:v', '2', pattern]
    subprocess.run(cmd, capture_output=True, timeout=1200)
    return len(list(Path(out_dir).glob('f_*.jpg')))


def extract_single(video_path: str, sec: int, out_path: str) -> bool:
    """특정 시점 프레임 1개 추출 (격자 OCR용 등)."""
    cmd = [FFMPEG, '-y', '-ss', str(sec), '-i', video_path, '-frames:v', '1', '-q:v', '2', out_path]
    result = subprocess.run(cmd, capture_output=True, timeout=30)
    return Path(out_path).exists()
