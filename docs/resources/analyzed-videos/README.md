# 명당 분석에 사용한 영상 기록 (중복 학습 방지)

> 프로 위치(명당) 추출에 쓴 PUBG e스포츠 영상 ID 목록. **다음에 학습/분석할 때 이 목록과 대조해 중복 영상을 제외**한다.
> 원본은 `.local/pub34-yolo-backup/`(gitignore)에 있어 유실 위험 → git으로 보존.

- `processed-video-ids.txt` — **실제 처리 완료 98편** (YouTube video ID, 11자).
- `candidate-video-ids-full.txt` — 후보 전체 107편 (처리 98 + 미처리 9).
- 형식: 한 줄에 video ID 하나. URL = `https://youtu.be/<ID>`.

## 중복 체크 방법
새 영상 분석 전: `grep -F <new_id> processed-video-ids.txt` → 있으면 이미 학습됨(스킵).
