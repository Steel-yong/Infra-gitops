# capture busy 가드 (skip-to-latest) — 계획

## 목적
프론트 0.5초/장 전송 vs 백엔드 2~3초/장 검출 → busy 가드 없으면 백로그·과부하. 1인당 부하를 "처리 1회당 1장"으로 캡. (capture-scaling.md ①.)

## 범위
- `FrameThrottle<T>` 순수 클래스(skip-to-latest) + capture.gateway 배선. 검출 로직 불변(외과적).
- ②③④(전송률·클라검출·최적화)는 플랜만, 구현 제외.

## 검증
- FrameThrottle 유닛(즉시/최신만/순차/에러처리/회귀) → 통과.
- gateway 변경은 외과적 + Codex 검수. 라이브 최종 확인은 사람.
