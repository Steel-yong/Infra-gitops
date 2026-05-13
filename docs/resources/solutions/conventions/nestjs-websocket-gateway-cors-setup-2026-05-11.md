---
title: "NestJS WebSocket Gateway CORS 설정 — socket.io 의존성 포함"
date: "2026-05-11"
category: "docs/solutions/conventions"
module: "capture-service"
problem_type: convention
component: tooling
severity: medium
applies_when:
  - "NestJS에서 @WebSocketGateway 데코레이터로 socket.io WebSocket 서버 생성 시"
  - "프론트엔드(다른 origin)에서 WebSocket 연결 시 CORS 오류 발생"
  - "pnpm workspace 모노레포에서 NestJS WebSocket 서비스 추가 시"
tags:
  - nestjs
  - websocket
  - socket-io
  - cors
  - gateway
  - pnpm-workspace
---

# NestJS WebSocket Gateway CORS 설정 — socket.io 의존성 포함

## Context

NestJS의 `@WebSocketGateway`는 `@nestjs/platform-socket.io`를 사용하지만, `socket.io` 패키지 자체는 peer dependency라서 명시적으로 설치하지 않으면 런타임 오류가 발생한다. 또한 CORS 설정을 `@WebSocketGateway` 데코레이터에 직접 해야 하며, NestJS의 `app.enableCors()`는 WebSocket에 적용되지 않는다.

## Guidance

**1. package.json에 socket.io 직접 설치:**

```json
{
  "dependencies": {
    "@nestjs/platform-socket.io": "^10.4.0",
    "@nestjs/websockets": "^10.4.0",
    "socket.io": "^4.7.5"
  }
}
```

**2. CORS는 데코레이터에 직접 설정:**

```typescript
// capture.gateway.ts
@WebSocketGateway({ cors: { origin: '*' } })
export class CaptureGateway {
  @WebSocketServer()
  server!: Server;
  // ...
}
```

**3. 타입 임포트:**

```typescript
import { Server, Socket } from 'socket.io';
```

## Why This Matters

- `@nestjs/platform-socket.io`는 socket.io를 의존하지만 peer dependency로 처리한다. pnpm의 strict peer dependency 정책으로 인해 명시적으로 추가하지 않으면 런타임에 `Cannot find module 'socket.io'`가 발생한다.
- `app.enableCors()`는 HTTP 레이어(Express/Fastify)에만 적용된다. WebSocket 핸드셰이크 CORS는 `@WebSocketGateway` 데코레이터 옵션으로만 설정 가능하다.

## When to Apply

NestJS 프로젝트에 WebSocket Gateway를 새로 추가할 때마다 적용.

## Examples

**프로덕션 환경에서는 origin을 구체적으로 지정:**

```typescript
@WebSocketGateway({
  cors: {
    origin: ['https://pubg-helper.example.com', 'http://localhost:3000'],
    credentials: true,
  }
})
```

**개발 환경에서 와일드카드:**

```typescript
@WebSocketGateway({ cors: { origin: '*' } })
```

## Related

- fix 커밋: `db23048` — capture socket.io 의존성 추가
