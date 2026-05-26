# PUB-37 컨텍스트 노트 — 결정과 이유

## 인식 방식 결정

- **치킨 = 노란 픽셀 비율**. 화면 가득 거대 노란 텍스트라 색 비율이 가장 단순·강건. OCR보다 빠르고 오탐 적음.
- **죽음 = OCR 키워드** ("로비로 나가기"/"관전"/"데스 캠"). 어두움만으론 비행 화면과 혼동되므로 문구로 확정.
- 둘 다 기존 `ocrWorker`(Tesseract) 인프라 위에 얹거나 별도 경량 검사.

## 초기화 범위

- `unlockCircle()` — 자기장 락 해제 → CircleOverlay·추천·하이라이트 자동 비워짐(추천은 lockedCircle 의존).
- 알람 — `useAlertTimer`의 notified/pending 상태 클리어 (게임종료 후 잔여 알림 방지).
- 화면공유 자체는 유지(다음 판 자동 재감지). 중복 트리거 방지(한 게임 1회).

## 독립성

- 명당(PUB-36)과 무관 — develop 기반 워크트리. `unlockCircle`(useLockedCircle)·`useAlertTimer`는 develop에 이미 있음.

## 진행 로그

- 2026-05-26 — 이슈(PUB-37) In Progress, 워크트리 생성, 계획 3종. 이미지 둘 다 확보(치킨·데스). 구현 시작 전.
