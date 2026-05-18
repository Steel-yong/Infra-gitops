"""격자 라벨 OCR + 변환식 도출.
PUB-34 검증: 1080p 프레임 OCR로 A~H 열 + I~P 행 라벨 추출 → 영상 정규화 → PUBG 좌표 변환식.

격자 매핑 (사용자 정보):
- 상단 A B C D E F G H = PUBG col 0~7
- 좌측 I J K L M N O P = PUBG row 0~7 (I=1, J=2, ..., P=8)
"""
import re, cv2, numpy as np

ROW_LABELS_MAP = {'I':1, 'J':2, 'K':3, 'L':4, 'M':5, 'N':6, 'O':7, 'P':8}
COL_LABELS = 'ABCDEFGH'

# PUBG 정규화 좌표: 셀 중심 = idx * 0.125 + 0.0625
def cell_center_x(col_idx: int) -> float: return col_idx * 0.125 + 0.0625
def cell_center_y(row_idx: int) -> float: return row_idx * 0.125 + 0.0625


def ocr_grid_labels(img, reader,
                    map_left_ratio: float = 0.22, map_right_ratio: float = 0.82,
                    upscale: int = 2) -> tuple[list[dict], list[dict]]:
    """프레임에서 격자 column (A~H) + row (I~P) 라벨 추출.
    reader: easyocr.Reader(['en']) 인스턴스 (재사용)."""
    h, w = img.shape[:2]
    map_left, map_right = int(w * map_left_ratio), int(w * map_right_ratio)
    map_img = img[:, map_left:map_right]
    mh, mw = map_img.shape[:2]

    # upscale + CLAHE
    big = cv2.resize(map_img, (mw*upscale, mh*upscale), interpolation=cv2.INTER_CUBIC)
    lab = cv2.cvtColor(big, cv2.COLOR_BGR2LAB)
    l, a, bb = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(16,16)).apply(l)
    big = cv2.cvtColor(cv2.merge((l,a,bb)), cv2.COLOR_LAB2BGR)

    results = reader.readtext(big, low_text=0.2, text_threshold=0.4)

    cols, rows = [], []
    for bbox, text, conf in results:
        if conf < 0.4: continue
        t = text.strip().upper()
        if not re.match(r'^[A-Z]$', t): continue
        xs = [p[0] for p in bbox]; ys = [p[1] for p in bbox]
        cx_big, cy_big = sum(xs)/4, sum(ys)/4
        cx, cy = cx_big/upscale, cy_big/upscale
        nx, ny = cx/mw, cy/mh

        if ny < 0.05 and t in COL_LABELS:
            col_idx = ord(t) - ord('A')
            cols.append({'label': t, 'px': nx, 'pubg_x': cell_center_x(col_idx)})
        elif nx < 0.05 and t in ROW_LABELS_MAP:
            row_idx = ROW_LABELS_MAP[t] - 1
            rows.append({'label': t, 'py': ny, 'pubg_y': cell_center_y(row_idx)})

    return cols, rows


def derive_transform(cols: list[dict], rows: list[dict]) -> tuple[tuple[float, float], tuple[float, float]] | None:
    """OCR 결과 → 선형 변환식 (px → PUBG_x, py → PUBG_y).
    최소 2개 column + 2개 row 라벨 필요."""
    if len(cols) < 2 or len(rows) < 2: return None
    px = np.array([c['px'] for c in cols])
    pubg_x = np.array([c['pubg_x'] for c in cols])
    a_x, b_x = np.polyfit(px, pubg_x, 1)
    py = np.array([r['py'] for r in rows])
    pubg_y = np.array([r['pubg_y'] for r in rows])
    a_y, b_y = np.polyfit(py, pubg_y, 1)
    return (float(a_x), float(b_x)), (float(a_y), float(b_y))


def apply_transform(px: float, py: float,
                    x_t: tuple[float, float], y_t: tuple[float, float]) -> tuple[float, float]:
    """선형 변환식 적용."""
    return x_t[0]*px + x_t[1], y_t[0]*py + y_t[1]


# PUB-34 매치 1 OCR로 도출된 기본 변환식 (페이즈 1 시점 기준)
DEFAULT_TRANSFORM_ERANGEL = ((1.0657, 0.0475), (1.0000, 0.0416))
