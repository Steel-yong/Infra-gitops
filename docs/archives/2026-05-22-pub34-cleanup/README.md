# 2026-05-22 PUB-34 cleanup

> 27도시 anchor map은 **v3 두 파일로 고정** — `docs/resources/mockups/2026-05-22-pub34-anchor-cities-v3{,-grid}.png`
> 학습 문서: [pub34-coordinate-transform-anchor-verification-2026-05-22.md](../../resources/solutions/architecture-patterns/pub34-coordinate-transform-anchor-verification-2026-05-22.md)

이 폴더는 다른 토픽의 옛 산출물만 보관 (anchor/city-names 시도 history는 사용자 결정으로 삭제됨).

## 폴더별 사유

### pub34-debug/ — 5/21 진화 알고리즘 디버깅 산출물
- 4hour-best, DEBUG-*, clean-pipeline, evolve-final/v2, per-match-grid, pov-trail/v2/v3
- auto_evolve_v2가 결과 통합한 후 validate.png에 최종 산출 → 중간 단계 보관

### old-reports/ — 5/11~5/18 PUB-30/31/32/33 작업
- 인프라 감사, 자기장 검출 보고서, 명당 리서치, 사이드바 결정 등
- 현재 PUB-34/35 진행 토픽과 다름

### grafana/ — Grafana 대시보드 작업
- 5/19 별도 토픽 (dashboard plan/drilldowns/overview)

## 복구 방법
```bash
mv docs/archives/2026-05-22-pub34-cleanup/<folder>/<file> docs/resources/mockups/
```

## 삭제된 폴더 (사용자 결정 2026-05-22)
- `superseded-anchor-versions/` — 5/20 anchor + v2 (v3로 대체)
- `v12-grid-not-anchor/` — 5/19 city-names-v12-* (격자 셀 시각화, anchor 아님)
- `discarded-myungdang/` — 5/20 53/159 hotspot (격자 OCR fallback 폐기)
- `city-names-intermediate/` — v5~v8 중간 버전

이력은 솔루션 문서 사례 1~5에 압축됨.
