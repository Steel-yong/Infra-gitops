---
title: "MediaStream은 Web Worker로 전달 불가 — Transferable 아님"
date: "2026-05-11"
category: "docs/solutions/integration-issues"
module: "capture-frontend"
problem_type: integration_issue
component: tooling
symptoms:
  - "worker.postMessage에 MediaStream 전달 시 오류 없이 전송되지만 Worker 내부에서 stream.getVideoTracks()가 빈 배열 반환"
  - "Worker 내 ImageCapture 생성 후 grabFrame() 호출 시 InvalidStateError 발생"
  - "TypeScript에서 stream을 Transferable로 캐스팅해도 런타임 오류"
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags:
  - mediastream
  - web-worker
  - transferable
  - imagecapture
  - screen-capture
---

# MediaStream은 Web Worker로 전달 불가 — Transferable 아님

## Problem

`getDisplayMedia()`로 획득한 `MediaStream`을 Web Worker에 `postMessage`의 Transferable 리스트로 전달하려 했으나, `MediaStream`은 브라우저 스펙 상 Transferable 인터페이스를 구현하지 않아 Worker 내부에서 정상 사용이 불가능하다.

## Symptoms

- `worker.postMessage({ stream }, [stream as unknown as Transferable])` 호출 시 TypeScript 컴파일은 통과하지만 런타임에 Worker 내 stream이 비어 있거나 오작동
- Worker 내에서 `msg.stream.getVideoTracks()` 호출 시 빈 배열 반환
- `new ImageCapture(track)` 이후 `grabFrame()`에서 `InvalidStateError: The object is in an invalid state`

## What Didn't Work

- `stream as unknown as Transferable` 타입 캐스팅으로 TypeScript 오류를 우회해도 런타임에서 스트림이 유효하지 않음
- `stream.getVideoTracks()[0]`만 Worker에 전달하는 시도 — `MediaStreamTrack`도 Transferable이 아님
- `OffscreenCanvas`를 Worker에 전달 후 메인 스레드에서 스트림을 붙이는 방식 — `OffscreenCanvas`에 `MediaStream`을 직접 연결하는 API 없음

## Solution

`ImageCapture`와 프레임 추출 로직을 **메인 스레드**에서 실행하고, Worker를 제거한다.
`setInterval`로 500ms마다 `grabFrame()` → Canvas 렌더링 → `toDataURL`로 base64 추출.

```typescript
// useScreenCapture.ts (수정 후)
const imageCapture = new ImageCapture(track);
const canvas = document.createElement('canvas');

intervalRef.current = setInterval(async () => {
  const bitmap = await imageCapture.grabFrame();
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  onFrame(base64);
}, 500);
```

## Why This Works

`MediaStream`과 `MediaStreamTrack`은 [Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) 목록에 없다. 전달 시 structured clone이 시도되지만 스트림의 내부 상태(네이티브 미디어 파이프라인)는 직렬화할 수 없으므로 Worker 쪽에서 빈 상태로 받게 된다.
`ImageCapture`와 `Canvas.toDataURL`은 메인 스레드에서 실행해도 UI를 블락하지 않을 만큼 빠르므로 Worker 없이도 충분하다.

## Prevention

- `getDisplayMedia` 기반 캡처는 메인 스레드에서 수행하고, 무거운 처리(이미지 분석 등)만 Worker로 넘긴다.
- Worker로 넘길 데이터는 반드시 Transferable이어야 한다: `ArrayBuffer`, `ImageBitmap`, `OffscreenCanvas`, `MessagePort` 등.
- `grabFrame()` 결과인 `ImageBitmap`은 Transferable이므로, 이미지 분석이 필요하면 bitmap을 Worker에 전달한다.

## Related Issues

- fix 커밋: `b2ad536` — MediaStream Worker 전송 오류 수정
