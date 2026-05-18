"""클러스터링 핫스팟 → seed.ts ERANGEL_PRO 블록 자동 생성.
PUB-33 v1 임시 시드를 영상 분석 결과로 교체."""
import json, re
from pathlib import Path

# 카테고리 추정 (좌표 → 격자 → 도시명 매핑)
# 시각 검증 후 확장. 일단 위치 기반 단순 분류.
CITY_REGIONS = [
    # (x_min, x_max, y_min, y_max, city_name, default_category)
    (0.35, 0.55, 0.45, 0.65, '포친키 권역', '랜드마크중심'),
    (0.55, 0.78, 0.40, 0.55, '학교/로족 권역', '랜드마크중심'),
    (0.12, 0.30, 0.20, 0.40, '조르조폴 권역', '랜드마크중심'),
    (0.60, 0.85, 0.05, 0.25, '야스나야 권역', '도시'),
    (0.40, 0.65, 0.75, 0.95, '소스노프카 군사기지 권역', '군사'),
    (0.75, 0.95, 0.45, 0.75, '밀타 권역', '도시'),
    (0.05, 0.25, 0.50, 0.80, '서남 해안 권역', '수계인접'),
    (0.55, 0.85, 0.55, 0.80, '동남 권역', '능선·고지'),
]


def classify_hotspot(gx: float, gy: float) -> tuple[str, str]:
    """좌표 → (지역명, 카테고리)."""
    for x_min, x_max, y_min, y_max, region, cat in CITY_REGIONS:
        if x_min <= gx <= x_max and y_min <= gy <= y_max:
            return region, cat
    return '기타', '랜드마크중심'


def hotspots_to_seed_block(hotspots: list[dict], min_match_count: int = 2,
                           max_locations: int = 100) -> str:
    """핫스팟 리스트 → seed.ts ERANGEL_PRO 블록 (TypeScript 코드).
    tier S/A/B는 매치 참여 수로 결정 (clustering.py 이미 매핑).
    min_match_count: 신뢰도 위한 최소 매치 수.
    """
    # 신뢰도 필터
    filtered = [h for h in hotspots if len(h['matches']) >= min_match_count]
    # 신뢰도 순 정렬 (이미 cluster_hotspots에서 됨)
    filtered = filtered[:max_locations]

    lines = []
    lines.append("  // 에란겔 명당 자리 — PUB-34 영상 분석 자동 생성 (v2)")
    lines.append(f"  // 데이터: PUBG Esports KR 채널 PWS (MAP) 영상 N개 클러스터링")
    lines.append("  // tier: S=3매치+ 공통, A=2매치 공통, B=1매치")
    lines.append("  const ERANGEL_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [")
    for i, h in enumerate(filtered, 1):
        region, cat = classify_hotspot(h['gx'], h['gy'])
        loc_id = f"er-pws-{i:03d}"
        team_name = f"{region} #{i}"
        lines.append(f"    {{ id: '{loc_id}', coordX: {h['gx']:.4f}, coordY: {h['gy']:.4f}, "
                     f"tier: '{h['tier']}', teams: ['{team_name}'] }},  // {cat} — {len(h['matches'])}매치 {h['count']}마커")
    lines.append("  ];")
    return "\n".join(lines)


def write_seed_update(hotspots: list[dict], seed_path: str, dry_run: bool = True) -> str:
    """seed.ts의 ERANGEL_PRO 블록 자동 교체.
    dry_run=True면 새 블록만 반환, False면 파일 수정."""
    block = hotspots_to_seed_block(hotspots)
    if dry_run:
        return block
    # 기존 ERANGEL_PRO 블록 패턴 매칭 + 교체
    seed = Path(seed_path).read_text(encoding='utf-8')
    pattern = re.compile(
        r'  const ERANGEL_PRO: \{ id: string;.*?\}\[\] = \[.*?\n  \];',
        re.S
    )
    new_seed = pattern.sub(block, seed)
    Path(seed_path).write_text(new_seed, encoding='utf-8')
    return block


if __name__ == "__main__":
    import sys
    batch_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/batch/batch_summary.json"
    data = json.load(open(batch_path))
    block = write_seed_update(data['hotspots'], seed_path="", dry_run=True)
    print(block)
