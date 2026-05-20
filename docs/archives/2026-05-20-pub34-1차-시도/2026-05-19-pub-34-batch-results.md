---
date: 2026-05-19
linear: PUB-34
status: 배치 분석 부분 완료, YouTube 봇 인증으로 추가 다운 차단
---

# PUB-34 배치 분석 결과 (자율 진행 세션)

## 시도 vs 처리

| 시도 | 처리됨 | 비고 |
|---|---|---|
| **15 PWS (MAP)** | **5 영상** (파이널 3 + 그룹 1 + 위클리 1) | 위클리 영상 10개는 `match_classifier` 인트로 분류 실패 (매치 0개 식별) |
| **10 PGS/PGC** | **1 영상** (RMcQHKwMwwg) | 나머지 9개 다운 실패 |
| **10 추가 PWS QUALIFIERS/마스터즈/RACE** | **0 영상** | 모두 YouTube 봇 인증 차단 |

**총 처리: 6 영상 / 마커 1216 / 핫스팟 28**

## YouTube 봇 인증 차단 (자율 진행 한계)

`yt-dlp` 새 영상 다운로드 시도:
```
ERROR: Sign in to confirm you're not a bot.
Use --cookies-from-browser or --cookies for the authentication.
```

시도한 player_client 모두 차단:
- android, ios, web_embedded, tv_embedded, mediaconnect, android_music

WSL 환경에 브라우저 쿠키 접근 불가 → **사용자가 깬 후 쿠키 export 필요**.

해결 방법 (사용자):
```bash
# Windows Chrome 쿠키 사용
python3 -m yt_dlp --cookies-from-browser "chrome:/mnt/c/Users/kim03/AppData/Local/Google/Chrome/User Data/Default" ...
```

## 처리된 5 PWS + 1 PGS = 6 영상 결과

### 영상별 매치
| 영상 | 매치 | 마커 |
|---|---:|---:|
| tp8tZdbZeDg (PWS 파이널 D3) | 3 | 209 |
| RC-L9Dk5ToI (PWS 파이널 D2) | 3 | 157 |
| Z3nPy8OlTU8 (PWS 파이널 D1) | 5 | 344 |
| fkyRuCQduS0 (PWS 위클리 W2 A/B) | 5 | 447 |
| RMcQHKwMwwg (PGS 3 그랜드 D2) | 1 | 59 |
| **합계** | **17** | **1216** |

### 상위 14중 추천 핫스팟 (가장 신뢰)
1. **(0.575, 0.159)** — E2 격자 (북부 본토), 67 마커, 14 매치
2. **(0.430, 0.929)** — D8 격자 (남쪽 군사기지), 136 마커, 12 매치
3. **(0.596, 0.986)** — E8 (군사기지 남쪽), 69 마커, 11 매치
4. **(0.652, 0.880)** — F8 (군사기지 동남), 27 마커, 11 매치
5. **(0.449, 0.721)** — D7 (남부 본토), 38 마커, 10 매치

### S tier 핫스팟 25곳 (3+ 매치 공통)
영상 분석 결과 (PWS 1257.json 참고).

## 알고리즘 한계 (정직히)

1. **매치 분류 fail** — 위클리 영상 10개 매치 0개 식별. PUB-36 후보 (자기장 기반 매치 식별).
2. **YouTube 봇 인증** — 새 영상 다운 차단, cookies 필요.
3. **단일 매치만 처리** — 영상별 6 매치 다 처리 안 됨. PUB-36 후보.
4. **페이즈 1만 변환** — 페이즈 2~5 zoom 보정 미구현. PUB-35 본 작업.

## 다음 작업 (사용자 깬 후)

1. **cookies export** — Windows Chrome 또는 Firefox 쿠키 사용해서 추가 영상 다운
2. **위클리 영상 매치 분류 개선** — `match_classifier` v3 (자기장 안정 기반)
3. **PR #80/81 검토** + 머지 결정
4. **PUB-35 본 작업** — 페이즈 2~5 zoom 보정

## 핫스팟 시각화

위 25곳을 에란겔 맵 위에 표시한 HTML — 다음 작업으로.
