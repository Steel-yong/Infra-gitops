---
module: frontend / MapCanvas
tags: [leaflet, crs-simple, min-zoom, fitbounds, map-rendering, recurring-bug]
problem_type: map-zoom-fit
date: 2026-06-01
---

# 지도 최소줌 반복버그 — 전체맵이 다 보이려면 plain contain fitBounds

## 적용 시점

다음을 만났을 때 이 문서 먼저 읽어라:
- `apps/frontend/src/components/MapCanvas.tsx`의 **최소줌/초기줌**을 건드리려 할 때.
- "지도가 너무 크다 / 너무 작다 / 위아래가 잘린다 / 회색 여백" 증상.

## 한 줄 결론

**Leaflet(CRS.Simple, 0~1 정사각 맵) 최소줌은 `fitBounds(BOUNDS)` 결과를 그대로 `setMinZoom`. cover 줌인·임의 offset 절대 추가 금지.** 추가하면 반드시 재발한다.

## 재발 이력

최소줌 로직은 최소 3커밋(`eb66942`, `ae09f49`, `4df6ce2`) 동안 고쳤다가 또 깨졌다.

## 깨지는 원인

`fitBounds(BOUNDS)`(contain) 뒤에 아래를 더하면 깨진다.
- **cover 줌인** `setZoom(getZoom() + log2(size.x/size.y))` → 정사각 맵의 **위/아래가 잘려** 전체맵이 안 보임.
- **임의 offset** (`-0.5`, `+0.5`) → 화면비/컨테이너 비율마다 다르게 동작해 너무 크거나(overflow) 너무 작음(회색 여백 사방).

## 정답 (2026-06-01 사용자 "딱좋다" 확정)

```ts
map.setMinZoom(-10);                                   // 이전 맵 잠금 해제
map.fitBounds(BOUNDS, { padding: [0, 0], animate: false }); // contain — 정사각 맵 전체가 화면 안에
map.setMinZoom(map.getZoom());                         // 그 값을 최소줌으로 고정
```

- cover 줌인·offset 전부 제거. 정사각 맵 전체가 보임(좌우 약간 여백은 감수 — 정사각 맵을 안 자르는 대가).
- `animate: false` 필수 — 애니메이션되면 직후 `getZoom()`이 이전(확대했던) 값을 반환해 그게 minZoom으로 잘못 박힌다(맵 전환 버그).

## 하지 말 것

- "한 단계만 더 줌인/줌아웃" 식 offset 추가. 다음 화면비에서 또 깨진다.
- 여백이 싫으면 offset 말고 **컨테이너를 맵 비율(정사각)에 맞추는** 방향으로.
