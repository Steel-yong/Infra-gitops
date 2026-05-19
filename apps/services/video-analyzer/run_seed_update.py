"""ml_dataset → seed.ts ERANGEL_PRO 블록 자동 갱신 진입점.

PUB-35: 페이즈 1 핫스팟만 사용 (진짜 명당 — 자유 선택 위치).
페이즈 2~5는 자기장 강제 위치라 명당 학습 가치 다름. 별도 활용 가능.

사용:
    python3 run_seed_update.py /tmp/pub34/ml_dataset_v2.json [seed_path]
"""
import json, sys
from pathlib import Path

import seed_writer


def main(dataset_path: str, seed_path: str = None, phase: int = 1, min_matches: int = 2):
    ds = json.load(open(dataset_path))
    hotspots = ds['hotspots_by_phase'].get(str(phase), [])

    print(f"=== 데이터셋: {dataset_path} ===")
    print(f"메타: {ds['metadata']}")
    print(f"페이즈 {phase} 핫스팟: {len(hotspots)}개")
    print(f"min_matches={min_matches} 필터 후: {sum(1 for h in hotspots if len(h['matches']) >= min_matches)}개")

    block = seed_writer.hotspots_to_seed_block(
        hotspots, min_match_count=min_matches, max_locations=100,
        phase_label=f"페이즈 {phase}만 — 자유 선택 명당",
    )
    print("\n=== 생성된 ERANGEL_PRO 블록 (첫 1500자) ===")
    print(block[:1500])
    print("...")

    if seed_path:
        result = seed_writer.write_seed_update(hotspots, seed_path, dry_run=False)
        print(f"\n✓ {seed_path} 업데이트")
    else:
        out = Path(dataset_path).parent / 'seed_block_p1.ts'
        out.write_text(block, encoding='utf-8')
        print(f"\n✓ dry-run 결과: {out}")
    return block


if __name__ == "__main__":
    dataset = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pub34/ml_dataset_v2.json"
    seed = sys.argv[2] if len(sys.argv) > 2 else None
    main(dataset, seed_path=seed, phase=1)
