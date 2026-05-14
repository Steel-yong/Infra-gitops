# PUB-30 체크리스트 — OCR 타이머 인식 검증 UI

Linear: https://linear.app/pubg-helper/issue/PUB-30
워크트리: `/mnt/d/infra project/feature-PUB-30`

## 1단계: 의존성 & 타입

- [ ] `tesseract.js` 의존성 추가 (`pnpm add tesseract.js -F @pubg-helper/frontend`)
- [ ] Tesseract worker API 타입 import 동작 확인 (`createWorker`, `Worker`)

검증: `pnpm install` 성공, `pnpm exec tsc --noEmit` 통과.

## 2단계: useOcrTimer 훅 (테스트 먼저)

- [ ] `__tests__/useOcrTimer.test.ts` 시나리오 8개 작성
  - video=null → idle
  - enabled=false → idle
  - video+enabled → 1초마다 worker.recognize 호출
  - recognize 결과 "1:38" → remainingSeconds=98
  - recognize 결과 "??" → remainingSeconds=null, rawText 유지
  - 픽셀에 빨간 비율 5% 초과 → isShrinking=true
  - 언마운트 → worker.terminate 호출
  - enabled false 전환 → interval clear + worker terminate
- [ ] 테스트 실행 → 전부 실패 확인 (구현 전)
- [ ] `hooks/useOcrTimer.ts` 구현
- [ ] 테스트 실행 → 전부 통과 확인
- [ ] 커버리지 ≥ 95%

검증: `pnpm --filter @pubg-helper/frontend test:coverage` 통과.

## 3단계: TimerPanel 컴포넌트 (테스트 먼저)

- [ ] `__tests__/TimerPanel.test.tsx` 시나리오 6개 작성
  - isCapturing=false → idle 메시지
  - rawText=null + isCapturing → "인식 없음" 표시
  - remainingSeconds=98 → "1:38" 표시
  - remainingSeconds=20 → 빨강 클래스
  - remainingSeconds=50 → 주황 클래스
  - cropDataUrl 있으면 img 렌더
- [ ] `components/TimerPanel.tsx` + `.module.css` 구현
- [ ] 테스트 통과 + 커버리지 ≥ 95%

검증: 위와 동일.

## 4단계: page.tsx 통합

- [ ] `useOcrTimer(videoRef.current, isCapturing)` 호출
- [ ] `<TimerPanel state={...} isCapturing={...} />` 사이드바에 배치
- [ ] 화면공유 안내 문구 제거 (사용자 요청)
- [ ] `page.test.tsx` 회귀 통과

검증: `pnpm --filter @pubg-helper/frontend test` 전체 회귀 통과.

## 5단계: 빌드 & 시각 검증

- [ ] `pnpm --filter @pubg-helper/frontend build` 성공
- [ ] Docker로 frontend 띄움 (PUB-30 워크트리 기준)
- [ ] `http://127.0.0.1:3000` 접속 → 화면공유 시작
- [ ] 사이드바 타이머 패널 표시 확인
- [ ] 크롭 이미지에 PUBG 타이머 영역이 잡히는지 확인
- [ ] OCR 결과 텍스트 표시 확인

검증: 사용자 시각 확인 + 스크린샷.

## 6단계: 커밋 & PR

- [ ] 논리 단위로 분리 커밋 (의존성 → 훅 → 컴포넌트 → 통합)
- [ ] `git push -u origin feature/PUB-30`
- [ ] PR 생성 base=develop, 제목 "feat(frontend): OCR 타이머 검증 UI (PUB-30)"
- [ ] Linear 이슈에 PR URL 첨부

검증: `gh pr view` 출력 확인.

## 작업 후 정리

- [ ] PUB-30 Linear 이슈 Done 상태
- [ ] 머지 후 워크트리 삭제
- [ ] 다음 작업 (페이즈 자동 감지) 결정 받기
