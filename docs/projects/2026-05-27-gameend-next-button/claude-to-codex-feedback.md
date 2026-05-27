# 사망판정 "다음" 변경 — Codex 리뷰 응답

## Response To Major
- [useGameEndDetect kor 워커·크롭 경로 미검증] **부분 반영 + 부분 반박.**
  - **반영**: 크롭 좌표 계산을 순수 함수 `nextButtonCropRect(w,h)`로 분리 → 유닛 테스트 2건 추가(1920×1080 정확값 + 프레임 내·하단 위치 보장). 좌표 회귀는 이제 막힌다. 총 13/13.
  - **반박(사용자 판정 대상)**: tesseract.js + canvas getContext + 타이머를 전부 mock하는 훅 통합 테스트는 보류.
    이유 ① jsdom canvas는 getContext가 null이라 drawImage/recognize 경로는 무거운 가짜 구현이 필요. ② 그 mock은 OCR이 실제로 "다음"을 읽는지를 mock으로 치환해버려, 정작 핵심(한글 OCR·크롭 렌더 정확도)은 검증 못 함 — 그건 **라이브(사망화면)로만** 확인 가능. ③ 검증 가능한 순수 로직(`isNextButton`·`nextButtonCropRect`)은 이미 테스트됨. ④ 동일 항목이 밤샘 D 작업 §8에서 제기됐고 "비용 대비 보류, 라이브 체크리스트로 대체"로 사용자 합의됨.
  - 같은 항목 2회 제기 → 바이블 anti-loop 규칙대로 **사용자 판정으로 상신**.

## Changes
- endScreenClassifier.ts: `nextButtonCropRect` 추가.
- useGameEndDetect.ts: 인라인 크롭 상수 → 순수 helper 사용.
- 테스트 13/13.

## 라이브 검증 항목 (사용자)
- 사망/결과 화면에서 좌하단 "다음"이 OCR(kor)로 잡혀 자기장 초기화되는지.
- 첫 사망 시 kor 학습데이터 다운로드로 1~2초 지연 가능(이후 캐시).
