"""자기장 원 검출 — 흰/회색 마스킹 + Hough Circle.
PUB-34 검증: 360p 100% 검출 (자기장 형성 후 시점). 좌측 팀 순위/우측 사이드바 제외."""
import cv2, numpy as np

# PUBG 공식 페이즈별 정규화 반경 (8km 전체 맵 기준)
PUBG_PHASE_RADII = [
    0.24474, 0.13461, 0.07403, 0.04072,
    0.02036, 0.01018, 0.00509, 0.00254,
]


def detect_zone(img, map_left_ratio: float = 0.219, map_right_ratio: float = 0.782) -> dict | None:
    """프레임에서 자기장 원 검출. 반환: 정규화 좌표 + 픽셀 좌표.
    map_left/right_ratio: 팀 순위/사이드바 제외 비율."""
    h, w = img.shape[:2]
    map_left = int(w * map_left_ratio)
    map_right = int(w * map_right_ratio)
    map_area = img[:, map_left:map_right]
    mh, mw = map_area.shape[:2]

    # 회색~흰색 (자기장 외곽선) 마스킹
    b, g, r = map_area[:,:,0], map_area[:,:,1], map_area[:,:,2]
    brightness = (r.astype(int) + g + b) / 3
    saturation = brightness - np.minimum(np.minimum(r, g), b)
    binary = ((brightness > 140) & (saturation < 50)).astype(np.uint8) * 255

    r_min = int(min(mh, mw) * 0.15)  # 화면의 15%↑ 큰 원만
    r_max = int(min(mh, mw) * 0.55)
    circles = cv2.HoughCircles(
        binary, cv2.HOUGH_GRADIENT, dp=1.5, minDist=400,
        param1=80, param2=30, minRadius=r_min, maxRadius=r_max
    )
    if circles is None:
        return None

    cx_local, cy, rad = circles[0][0]
    cx_global = cx_local + map_left
    return {
        'x_screen': float((cx_global - map_left) / (map_right - map_left)),
        'y_screen': float(cy / h),
        'r_screen': float(rad / min(mw, mh)),
        'cx_px': float(cx_global), 'cy_px': float(cy), 'r_px': float(rad),
        'map_left': map_left, 'map_right': map_right,
    }


def estimate_phase(r_screen: float) -> dict | None:
    """화면 반경 → PUBG PHASE 추정 (zoom 0.8~5 가정).
    실제로는 시간 진행 정보가 더 정확. PUB-35에서 보정."""
    candidates = []
    for phase, std_r in enumerate(PUBG_PHASE_RADII, 1):
        zoom = r_screen / std_r
        if 0.8 <= zoom <= 5:
            candidates.append({'phase': phase, 'zoom': zoom})
    if not candidates: return None
    return min(candidates, key=lambda c: abs(c['zoom'] - 1))
