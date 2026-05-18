"""PWS 인트로 화면에서 매치별 맵 순서 자동 추출.
인트로 화면 (보라색 배경)에 'ERANGEL MIRAMAR RONDO TAEGO MIRAMAR ERANGEL' 같이
6개 매치의 맵 이름이 가로로 나열됨."""
import cv2, re

MAP_KEYWORDS = ['ERANGEL', 'MIRAMAR', 'TAEGO', 'RONDO', 'VIKENDI', 'SANHOK',
                'PARAMO', 'KARAKIN', 'HAVEN', 'DESTON']


def extract_match_maps(img, reader) -> list[str]:
    """인트로 프레임에서 맵 이름 순서 추출.
    reader: easyocr.Reader(['en'])."""
    h, w = img.shape[:2]
    # 매치 맵 이름이 화면 중상단 (y 0.15~0.55) 6개 카드에 표시
    # 정확 영역: 좌우 가장자리 + 중간 (전체 사용)
    big = cv2.resize(img, (w*2, h*2), interpolation=cv2.INTER_CUBIC)
    results = reader.readtext(big, low_text=0.3, text_threshold=0.5)

    maps_with_pos = []
    for bbox, text, conf in results:
        if conf < 0.5: continue
        t = text.strip().upper()
        for keyword in MAP_KEYWORDS:
            if keyword in t or t in keyword:
                xs = [p[0] for p in bbox]
                cx = sum(xs) / 4 / 2  # 원본 좌표
                maps_with_pos.append((cx, keyword))
                break

    # x 좌표 순 정렬
    maps_with_pos.sort(key=lambda m: m[0])
    return [m[1] for m in maps_with_pos]


def detect_match_map_order(intro_frame_path: str, reader) -> list[str]:
    """인트로 프레임 1개 → 6 매치 맵 순서."""
    img = cv2.imread(intro_frame_path)
    if img is None: return []
    return extract_match_maps(img, reader)
