#!/bin/bash
# CORE + 역할 파일을 합쳐 CLAUDE.md / AGENTS.md 생성. 모드: collab | solo.
# 사용법: bash docs/agent-bibles/build_bibles.sh [collab|solo]
set -euo pipefail

MODE="${1:-collab}"
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
CORE="$DIR/00-CORE.md"

case "$MODE" in
  collab) CLAUDE_ROLE="$DIR/claude-collab.md"; CODEX_ROLE="$DIR/codex-collab.md" ;;
  solo)   CLAUDE_ROLE="$DIR/claude-solo.md";   CODEX_ROLE="$DIR/codex-solo.md" ;;
  *) echo "모드는 collab 또는 solo"; exit 1 ;;
esac

build() {  # $1=출력파일 $2=제목 $3=역할파일
  {
    echo "# $2"
    echo ""
    echo "<!-- 생성됨: build_bibles.sh $MODE ($(date +%Y-%m-%d)). 직접 수정 금지 — 00-CORE.md 또는 역할 파일을 고치고 재빌드. -->"
    echo "<!-- 현재 모드: $MODE -->"
    echo ""
    cat "$CORE"
    echo ""
    cat "$3"
  } > "$1"
  echo "생성: $1 ($(wc -l < "$1") 줄)"
}

build "$ROOT/CLAUDE.md"  "PUBG Helper — Claude 바이블 ($MODE)" "$CLAUDE_ROLE"
build "$ROOT/AGENTS.md"  "PUBG Helper — Codex 바이블 ($MODE)"  "$CODEX_ROLE"
echo "완료 (모드: $MODE)"
