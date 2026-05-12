---
title: "WSL2 환경에서 Next.js HMR 미작동 — webpack polling 설정 필요"
date: "2026-05-11"
category: "docs/solutions/developer-experience"
module: "frontend-dev-setup"
problem_type: developer_experience
component: development_workflow
severity: medium
applies_when:
  - "Windows WSL2 환경에서 Next.js 개발 서버 실행"
  - "파일 수정 후 HMR(Hot Module Replacement)이 작동하지 않을 때"
  - "next dev가 실행 중이지만 파일 변경을 감지하지 못할 때"
tags:
  - wsl2
  - webpack
  - hmr
  - polling
  - nextjs
  - file-watching
---

# WSL2 환경에서 Next.js HMR 미작동 — webpack polling 설정 필요

## Context

WSL2(Windows Subsystem for Linux 2)에서 `/mnt/d/` 등 Windows 파일시스템을 마운트한 경로에서 Next.js를 실행하면, inotify 기반 파일 감시 이벤트가 윈도우즈 NTFS → WSL2 커널 계층을 거치며 누락된다. `next dev`가 실행 중이어도 소스 파일 수정 후 HMR이 트리거되지 않는다.

## Guidance

`next.config.js`의 `webpack` 함수에서 `watchOptions.poll`을 설정해 폴링 방식으로 전환한다.

```javascript
// next.config.js
const nextConfig = {
  transpilePackages: ['@pubg-helper/shared'],
  webpack: (config) => {
    config.watchOptions = {
      poll: 2000,           // 2초마다 폴링
      aggregateTimeout: 300,
      ignored: ['**/node_modules/**', '**/.next/**'],
    };
    return config;
  },
};
```

`allowedDevOrigins`는 WSL2 IP 대역(172.20.x.x)에서 개발 서버에 접근할 때 CORS를 허용하기 위해 추가한다.

```javascript
allowedDevOrigins: ['172.20.0.2'],
```

## Why This Matters

WSL2의 `/mnt/` 경로는 Windows DrvFs를 통해 마운트된 파일시스템으로, Linux inotify가 이 파티션의 변경 이벤트를 수신하지 못한다. polling 없이는 `next dev`가 파일 변경을 영원히 모르며 HMR이 죽어 있어 개발 생산성이 크게 떨어진다.

## When to Apply

- WSL2에서 `/mnt/c/`, `/mnt/d/` 등 Windows 파일시스템 경로에 프로젝트가 있을 때
- `next dev` 실행 후 파일 수정해도 브라우저 자동 새로고침이 없을 때
- Docker Desktop WSL2 백엔드 환경도 동일한 문제 발생

## Examples

WSL2 네이티브 파일시스템(`~/projects/`)이라면 폴링 불필요 — inotify가 정상 작동한다.
Windows 마운트 경로(`/mnt/d/`)라면 polling 필수.

```
# WSL2에서 프로젝트 경로 확인
pwd
# /mnt/d/infra project/Infra-gitops  → polling 필요
# /home/kim/projects/myapp           → polling 불필요
```

## Related

- fix 커밋: `b2ad536` — WSL2 파일감시 폴링 설정
