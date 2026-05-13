---
title: "PUBG 자기장 원 감지 — Sharp + Kasa 대수적 최소제곱법"
date: "2026-05-11"
category: "docs/solutions/architecture-patterns"
module: "capture-service-circle"
problem_type: architecture_pattern
component: tooling
severity: high
applies_when:
  - "화면 캡처 이미지에서 자기장 원(흰색 테두리)을 감지해야 할 때"
  - "브라우저/Node.js에서 경량 원 검출 구현이 필요할 때"
  - "OpenCV 없이 TypeScript로 이미지 내 원을 피팅해야 할 때"
tags:
  - circle-detection
  - sharp
  - kasa-fit
  - image-processing
  - pubg
  - hough-circle
---

# PUBG 자기장 원 감지 — Sharp + Kasa 대수적 최소제곱법

## Context

PUBG 전체맵에서 자기장 원을 감지하기 위해 Hough Circle Transform을 직접 구현하는 방향을 초기 검토했으나, O(r × N²) 복잡도로 Node.js에서 실시간 처리에 부적합했다. 대신 흰색 픽셀(자기장 원 테두리)을 수집한 뒤 Kasa 대수적 원 피팅을 적용해 중심과 반경을 직접 계산한다.

## Guidance

**구현 파이프라인:**

1. `sharp`로 이미지를 raw RGB 버퍼로 변환
2. 4픽셀 간격 샘플링으로 흰색 픽셀(`R > 200, G > 200, B > 200`) 수집
3. 수집된 점들에 Kasa 대수적 최소제곱법으로 원 피팅
4. 픽셀 좌표를 `[0, 1]` 정규화

```typescript
// circle.service.ts — 핵심 알고리즘
async extractCircle(base64: string): Promise<CircleData | null> {
  const { data, info } = await sharp(Buffer.from(base64, 'base64'))
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const points: [number, number][] = [];
  for (let y = 0; y < info.height; y += 4) {
    for (let x = 0; x < info.width; x += 4) {
      const i = (y * info.width + x) * 3;
      if (data[i] > 200 && data[i+1] > 200 && data[i+2] > 200) {
        points.push([x, y]);
      }
    }
  }

  if (points.length < 10) return null;
  const circle = fitCircle(points);
  if (!circle) return null;

  return {
    x: circle.cx / info.width,
    y: circle.cy / info.height,
    r: circle.r / Math.min(info.width, info.height),
  };
}
```

**Kasa 원 피팅 (`fitCircle` 함수):**

```typescript
function fitCircle(points: [number, number][]): { cx: number; cy: number; r: number } | null {
  const n = points.length;
  const mx = points.reduce((s, [x]) => s + x, 0) / n;
  const my = points.reduce((s, [, y]) => s + y, 0) / n;

  let Suu = 0, Svv = 0, Suv = 0, Suuu = 0, Svvv = 0, Suuv = 0, Suvv = 0;
  for (const [x, y] of points) {
    const u = x - mx, v = y - my;
    Suu += u*u; Svv += v*v; Suv += u*v;
    Suuu += u*u*u; Svvv += v*v*v;
    Suuv += u*u*v; Suvv += u*v*v;
  }

  const b1 = (Suuu + Suvv) / 2;
  const b2 = (Svvv + Suuv) / 2;
  const det = Suu * Svv - Suv * Suv;
  if (Math.abs(det) < 1e-10) return null;

  const uc = (b1 * Svv - b2 * Suv) / det;
  const vc = (b2 * Suu - b1 * Suv) / det;
  const cx = uc + mx;
  const cy = vc + my;
  const r = Math.sqrt(uc*uc + vc*vc + (Suu + Svv) / n);

  return { cx, cy, r };
}
```

## Why This Matters

- **Hough Circle Transform 미사용 이유**: 반경 범위 탐색이 필요한 Hough는 전체맵 이미지(~800×800px 이상)에서 초당 2프레임 처리가 어렵다. Kasa 피팅은 O(N) 복잡도로 4픽셀 샘플링 후 수백 점에서 수 밀리초 이내 처리 가능.
- **전제 조건**: 이미지에 원 하나만 존재하고 흰색 노이즈가 적을 때 정확도가 높다. PUBG 전체맵은 자기장 원이 하나뿐이므로 적합.

## When to Apply

이미지에서 단일 원의 중심/반경을 추출해야 할 때. 여러 원이 겹치거나 노이즈가 많으면 RANSAC 기반 피팅을 검토한다.

## Examples

전체맵 열림 감지(`map-detection.service.ts`)로 먼저 `isMapOpen()` 확인 후 `extractCircle()` 호출:

```typescript
const isOpen = await this.mapDetectionService.isMapOpen(base64);
if (!isOpen) return null;
const circle = await this.circleService.extractCircle(base64);
```

## Related

- 관련 서비스: `apps/services/capture/src/capture/circle.service.ts`
- 연관 서비스: `map-detection.service.ts` (파란색 비율로 전체맵 열림 판단)
