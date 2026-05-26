<!-- 프로젝트 전용(PUBG). build_bibles.sh가 generic/CORE와 역할 파일 사이에 끼워 넣는다. -->

## 8부. 프로젝트 정보

### 개요
배틀그라운드 보조 웹서비스. 화면공유 하나로 전체맵 자기장 분석 + 프로 위치 추천 + 자기장 알림 제공.

### 모노레포 구조
```
Infra-gitops/
├── apps/
│   ├── frontend/                 # Next.js 14 (App Router)
│   └── services/
│       ├── capture/              # 화면캡처 + 이미지분석 (NestJS)
│       ├── location/             # 프로 위치 추천 (NestJS)
│       └── alert/                # 자기장 타이머 + 알림 (NestJS)
├── packages/shared/              # 공통 타입·DTO
├── docs/{projects,areas,resources,archives}/
├── clusters/                     # K8s 매니페스트
├── applicationsets/              # ArgoCD AppSet
├── docker-compose.yml
└── pnpm-workspace.yaml
```

### 기술 스택
| 분류 | 기술 | 이유 |
|------|------|------|
| 언어 | TypeScript 전체 | Claude Code 단일 컨텍스트 |
| 프론트 | Next.js 14 (App Router) | SSR + 실시간 |
| 지도 | Leaflet.js (CRS.Simple) | 커스텀 오버레이, 휠 줌 |
| 화면인식 | Screen Capture API + Canvas | 브라우저 네이티브 |
| OCR | Tesseract.js (Web Worker) | 숫자+콜론 전용 |
| 백엔드 | NestJS | TS + WebSocket 기본 |
| 실시간 | WebSocket (Socket.io) | 프레임 분석 결과 |
| 이미지 처리 | Sharp | 서버사이드 분석 |
| DB | PostgreSQL + Prisma | 위치/세션 |
| 모노레포 | pnpm workspace | 패키지 공유 |
| AI (Phase 6) | Python FastAPI | 프로 위치 학습 |

### 서비스별 역할
- **frontend (Next.js 14)**: 맵 선택, 화면공유(`getDisplayMedia`), Leaflet 지도 + 자기장 오버레이 + 휠 줌, 프로 위치 마커(S/A/B 등급·중심거리순), 알림 설정(30/20/10초), Web Workers 캡처/OCR.
- **capture-service (NestJS, :3001)**: WebSocket으로 프레임 수신, 전체맵 열림 감지(청록 3%↑), 자기장 원 추출(흰 픽셀 → 원 피팅 → 0~1 정규화), 결과 전송.
- **location-service (NestJS, :3002)**: 자기장 원(x,y,r) → 원 안 프로 위치 필터 + 거리순 정렬 → S/A/B 등급 마커.
- **alert-service (NestJS, :3003)**: 미니맵 타이머 크롭 → Tesseract OCR, 빨간 느낌표 픽셀로 자기장 상태 구분(있음=30/20/10초 알림, 없음=대기), Web Notifications 발송.
- **shared**: `CircleData`(x,y,r 0~1), `MapType`, `LocationData`, `TimerState`, `SocketEvents`.

### 인프라
- K8s: Master 172.20.0.10 / Worker-1 .11 / Worker-2 .12.
- Harbor(레지스트리), ArgoCD(GitOps, Sync-Wave 50), Envoy Gateway(172.20.0.100), Vault + ESO(시크릿), Longhorn(PVC), Cilium(CNI).

### 좌표계 주의사항
- `CircleData.y`, `LocationData.coordY` → 이미지 좌표계(위 0 → 아래 1).
- Leaflet `CRS.Simple` → lat 위로 증가(아래 0 → 위 1).
- Marker는 `[1 - y, x]`로 변환한다. (SVGOverlay는 SVG 좌표계가 이미지와 같으므로 그대로.)
