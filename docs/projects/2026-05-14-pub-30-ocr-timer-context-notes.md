# PUB-30 컨텍스트 노트 — OCR 타이머 인식 검증

## 왜 이 작업이 우선인가

자기장 알림 자동화의 핵심 부품은 OCR. 그런데 현재 OCR이 동작하는지 검증된 적이 없다.

- `ocrWorker.ts`는 이미 작성됨: `parseTimerString`, `detectExclamationMark`
- 그러나 실제 Tesseract.js 통합이 없음
- 사용자 화면공유 video → 타이머 영역 crop → Tesseract → text 파싱 흐름이 끊겨 있음

→ 알림 자동 발송 구현 전에 **OCR이 PUBG 화면 타이머를 실제로 읽을 수 있는지 사용자가 시각적으로 확인**할 수 있어야 함.

## 설계 결정

### 1. Tesseract worker 생명주기

- 마운트 시 1회 `createWorker('eng')` + `setParameters`
- 1초 간격 setInterval로 video → canvas crop → worker.recognize
- 언마운트 시 `worker.terminate()`
- 동시에 여러 recognize 방지: `busyRef`로 진행 중 표시

이유: Tesseract worker 초기화는 비용이 큼 (수 초). 매번 재생성하면 안 됨.

### 2. 크롭 영역

`ocrWorker.ts`의 `getTimerRegion`을 그대로 활용:
- 1920×1080: `{ x: 1680, y: 820, w: 180, h: 35 }`
- 2560×1440: `{ x: 2240, y: 1095, w: 240, h: 46 }`
- 3840×2160: `{ x: 3360, y: 1640, w: 360, h: 70 }`

매칭 해상도 없으면 1920×1080 폴백.

### 3. 빨간 느낌표 감지 영역

타이머 텍스트 좌측 20% 폭만큼 추가 크롭. `detectExclamationMark` 사용.
- 빨강 픽셀 비율 5% 초과 → `isShrinking=true`

### 4. 디버깅 패널 표시 항목

사용자가 OCR 정상 동작을 시각적으로 확인할 수 있도록.

| 항목 | 목적 |
|------|------|
| 잔여 초 (M:SS) | 파싱 성공 여부 + 색상으로 상태 표현 |
| 상태 배지 | 빨간 느낌표 감지 결과 |
| 원본 인식 텍스트 | Tesseract가 무엇을 읽었는지 그대로 |
| 크롭 영역 좌표 | 어디서 크롭했는지 (해상도 디버깅) |
| 시도 횟수 | OCR이 도는지 확인 |
| 크롭 이미지 미리보기 | **가장 중요** — 정확한 영역인지 시각 확인 |

크롭 이미지가 잘 잡히지 않으면 `TIMER_REGIONS` 좌표 조정 필요.

### 5. 알림 통합은 다음 작업

이번 PR에서는 OCR 동작 검증만. 30/20/10초 Web Notification 발송은 OCR 신뢰성 확인 후 별도 이슈.

## 예상 실패 시나리오

| 실패 | 원인 후보 | 대응 |
|------|---------|------|
| 크롭 이미지가 빈 화면 | video 아직 로딩 안 됨 | videoWidth=0 가드 |
| 크롭 이미지 영역이 잘못됨 | 해상도별 좌표 부정확 | TIMER_REGIONS 측정 후 조정 |
| OCR 텍스트 항상 빈 문자열 | Tesseract 모델 미로드 | `await createWorker('eng')` 완료 확인 |
| 인식되지만 숫자가 이상함 | 폰트 인식률 낮음 | 전처리 (대비 증가, 크기 확대) |
| 빨간 느낌표 항상 false | 좌측 영역 좌표 또는 RGB 임계 | 디버깅 패널에 픽셀 비율도 표시 (추후) |

## 다음 결정 사항 (이번 작업 후)

OCR이 동작하는지 확인되면:
1. **신뢰성 검증** — 1페이즈/2페이즈 등 다양한 시점에서 정확도 측정
2. **알림 통합** — `useAlertTimer` + `useWebNotifications` 연결
3. **페이즈 자동 감지** — OCR 타이머 + 누적 시간으로 페이즈 추정

신뢰성이 낮으면:
- `TIMER_REGIONS` 재측정
- Tesseract 전처리 추가 (이진화, 확대)
- 또는 OCR 포기 + 사용자 입력 방식 검토 (사용자 반대했으나)
