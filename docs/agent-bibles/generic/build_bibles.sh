#!/bin/bash
# generic CORE + project 정보 + 역할 파일을 합쳐 CLAUDE.md / AGENTS.md 생성. 모드: collab | solo.
# 사용법: bash docs/agent-bibles/generic/build_bibles.sh [collab|solo]
# 새 프로젝트: generic/ 를 그대로 복사하고 ../project/<name>.md 만 새로 쓴 뒤 이 스크립트 실행.
set -euo pipefail

MODE="${1:-collab}"
DIR="$(cd "$(dirname "$0")" && pwd)"      # docs/agent-bibles/generic
ROOT="$(cd "$DIR/../../.." && pwd)"       # repo 루트
CORE="$DIR/CORE.md"
# project/ 의 .md 하나를 자동 사용 (새 프로젝트는 이 파일만 교체). PROJECT_FILE 로 강제 지정 가능.
PROJECT="${PROJECT_FILE:-$(ls "$DIR"/../project/*.md 2>/dev/null | head -1)}"
[ -n "$PROJECT" ] && [ -f "$PROJECT" ] || { echo "project 파일 없음 (docs/agent-bibles/project/*.md)"; exit 1; }
NAME="${PROJECT_NAME:-$(basename "$PROJECT" .md)}"   # 출력 제목용 프로젝트명 (PROJECT_NAME으로 강제 지정 가능)

case "$MODE" in
  collab) CLAUDE_ROLE="$DIR/claude-collab.md"; CODEX_ROLE="$DIR/codex-collab.md" ;;
  solo)   CLAUDE_ROLE="$DIR/claude-solo.md";   CODEX_ROLE="$DIR/codex-solo.md" ;;
  *) echo "모드는 collab 또는 solo"; exit 1 ;;
esac

build() {  # $1=출력파일 $2=제목 $3=역할파일
  {
    echo "# $2"
    echo ""
    echo "<!-- 생성됨: build_bibles.sh $MODE ($(date +%Y-%m-%d)). 직접 수정 금지 — generic/CORE.md·project/$(basename "$PROJECT")·역할 파일을 고치고 재빌드. -->"
    echo "<!-- 현재 모드: $MODE -->"
    echo ""
    cat "$CORE"      # §0~7 방법론 (프로젝트 무관)
    echo ""
    cat "$PROJECT"   # §8 프로젝트 정보
    echo ""
    cat "$3"         # §9~ 역할 (collab/solo)
  } > "$1"
  echo "생성: $1 ($(wc -l < "$1") 줄)"
}

build "$ROOT/CLAUDE.md"  "$NAME — Claude 바이블 ($MODE)" "$CLAUDE_ROLE"
build "$ROOT/AGENTS.md"  "$NAME — Codex 바이블 ($MODE)"  "$CODEX_ROLE"
echo "완료 (모드: $MODE)"
