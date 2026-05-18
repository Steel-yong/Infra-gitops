"""맵 종류 자동 식별 (에란겔 vs 태이고).
PWS 영상에 여러 맵 매치 섞일 수 있음. 매치별 페이즈 1 프레임으로 식별.

에란겔: 정사각 본토 + 남쪽 작은 군사기지 섬 (Y-shape)
태이고: 동서로 긴 본토 + 동측 부속 섬 + 다리 (Z-shape)
미라마: 정사각 본토, 사막색
론도: 본토 + 동측 작은 섬
"""
import cv2, numpy as np


def map_signature(img, map_left_ratio: float = 0.22, map_right_ratio: float = 0.82) -> dict:
    """본토 외곽 모양 + 평균 색상 → 맵 식별 시그니처."""
    h, w = img.shape[:2]
    map_left, map_right = int(w * map_left_ratio), int(w * map_right_ratio)
    area = img[:, map_left:map_right]

    # 본토 vs 바다 마스크 (어두운 청색 = 바다)
    b, g, r = area[:,:,0], area[:,:,1], area[:,:,2]
    brightness = (r.astype(int) + g + b) / 3
    sea = (b > r + 5) & (brightness < 65)
    land = ~sea

    if land.sum() < 1000:
        return {'map': 'unknown', 'land_ratio': 0}

    ys, xs = np.where(land)
    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()
    bbox_w, bbox_h = x_max - x_min, y_max - y_min
    aspect = bbox_w / bbox_h if bbox_h else 0

    # 본토 평균 색
    land_pixels = area[land]
    avg_r, avg_g, avg_b = land_pixels[:,2].mean(), land_pixels[:,1].mean(), land_pixels[:,0].mean()

    # 남쪽 작은 섬 (y > 0.75) 비율
    south_y = int(area.shape[0] * 0.75)
    south_land_ratio = land[south_y:].sum() / land.sum()

    # 동남 부속 섬 (태이고 특징, 우측 하단)
    east_x = int(area.shape[1] * 0.75)
    east_south_ratio = land[south_y:, east_x:].sum() / land.sum()

    # 시그니처 매칭
    # - 에란겔: 평균 R~G~B (회녹색 비슷), 남쪽 섬 5~15%, aspect ~1
    # - 태이고: 더 녹색 (G > R), 남쪽 섬 적음, 우측 부속 많음, aspect 다소 길쭉
    # - 미라마: 사막 (R > G > B 큰 차이)
    is_desert = (avg_r > avg_g + 20) and (avg_r > avg_b + 30)
    is_taego = (east_south_ratio > 0.08) and not is_desert
    is_erangel = (0.06 < south_land_ratio < 0.20) and (0.85 < aspect < 1.15) and not is_desert and not is_taego

    if is_erangel:
        map_type = 'erangel'
    elif is_taego:
        map_type = 'taego'
    elif is_desert:
        map_type = 'miramar'
    else:
        map_type = 'unknown'

    return {
        'map': map_type,
        'land_ratio': round(float(land.sum() / land.size), 3),
        'aspect': round(float(aspect), 3),
        'avg_rgb': (int(avg_r), int(avg_g), int(avg_b)),
        'south_island_ratio': round(float(south_land_ratio), 3),
        'east_south_ratio': round(float(east_south_ratio), 3),
    }
