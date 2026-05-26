# PUB-37 — 게임 종료 인식 (치킨/죽음) → 알람·UI 초기화

> Linear PUB-37. 워크트리 feature-PUB-37 (base develop). 명당(PUB-36)과 독립.

## 무엇을 왜

게임이 끝나면(치킨 또는 죽음) 알람이 계속 울리고 자기장 락이 남는다. 종료를 인식해 ① 알람 정지 ② UI 초기화(자기장 락 해제 → 추천·마커 비워짐)해서 다음 판에 새로 잡도록.

## 인식 기준 (확보된 이미지 분석)

- **치킨** (`.claude/images/치킨.png`) — 화면 가득 **노란 "WINNER WINNER CHICKEN DINNER!"**. → **노란 픽셀 비율**이 매우 높음(단순·강건). 보조로 OCR "WINNER".
- **죽음** (`.claude/images/데스.png`) — 어두운 화면 + 우상단 "#N/100" + **"로비로 나가기 / 관전 / 데스 캠"** 버튼 + 사망 문구. → OCR로 "로비로 나가기"/"관전"/"데스 캠" 탐지가 안정적(어두움만으론 비행과 헷갈림).

## 단계 (검증 포함)

1. `useGameEndDetect(video, isCapturing)` 훅 — 주기적으로 프레임 검사. 치킨=노란 비율 임계, 죽음=OCR 키워드. → **검증**: 치킨/죽음 목업 입력 테스트.
2. page.tsx 배선 — `gameEnded` 시 `unlockCircle()` + 알람 리셋(`useAlertTimer` notified 초기화) + 1회만 트리거. → **검증**: 트리거 테스트.
3. `useAlertTimer`에 리셋 경로 확인/추가 (게임종료 시 pending·notified 클리어). → **검증**: 리셋 후 재알림 안 됨.
4. 커버리지 95% → **검증**: `pnpm --filter frontend test:coverage`(node 컨테이너).

## 파일 (예정)

- Create: `apps/frontend/src/hooks/useGameEndDetect.ts` (+test)
- Modify: `apps/frontend/src/app/page.tsx` (gameEnded → reset 배선)
- Modify(필요시): `apps/frontend/src/hooks/useAlertTimer.ts` (reset)
- 기존 `ocrWorker`/`useOcrTimer` 재사용 검토

## 리스크

- 죽음 화면이 비행(어두움)과 혼동 → OCR 키워드로 구분.
- OCR 비용 → 게임종료 검사는 저빈도(예: 1~2초마다)로.
- 검증 환경: node 없음 → 도커(node:20 이미지)로 테스트 (PUB-36과 동일 방식).
