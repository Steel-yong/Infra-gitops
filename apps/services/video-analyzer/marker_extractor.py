"""팀 위치 마커 추출 — 자기장 안 채도 높은 픽셀 → DBSCAN 클러스터."""
import cv2, numpy as np
from sklearn.cluster import DBSCAN


def extract_markers(img, zone: dict,
                    saturation_min: int = 100, value_min: int = 80,
                    cluster_eps: int = 8, min_samples: int = 5,
                    cluster_min_pixels: int = 10, cluster_max_pixels: int = 500) -> list[dict]:
    """zone 안의 채도 높은 픽셀 → 클러스터 → 마커.
    PUB-34 720p 검증: 평균 14개 마커/프레임 (16팀 기준 합리적)."""
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    S, V = hsv[:,:,1], hsv[:,:,2]
    saturated = (S > saturation_min) & (V > value_min)

    yy, xx = np.indices((h, w))
    in_zone = ((xx - zone['cx_px'])**2 + (yy - zone['cy_px'])**2) <= (zone['r_px'] * 1.2)**2
    mask = saturated & in_zone
    mask[:, :zone['map_left']] = False
    mask[:, zone['map_right']:] = False

    ys, xs = np.where(mask)
    if len(xs) == 0: return []

    points = np.column_stack([xs, ys])
    cluster = DBSCAN(eps=cluster_eps, min_samples=min_samples).fit(points)
    labels = cluster.labels_

    markers = []
    for label in set(labels):
        if label == -1: continue
        cpts = points[labels == label]
        if not (cluster_min_pixels <= len(cpts) <= cluster_max_pixels): continue
        cx, cy = cpts.mean(axis=0)
        bgr = img[int(cy), int(cx)]
        markers.append({
            'cx_norm': float(cx) / w, 'cy_norm': float(cy) / h,
            'rgb': (int(bgr[2]), int(bgr[1]), int(bgr[0])),
            'pixel_count': int(len(cpts)),
        })
    return markers
