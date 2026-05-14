# 집에서 PUB-30 작업 이어가기

## 사전 준비 (각 컴퓨터에서 1회)

1. **Docker Desktop 설치** (Windows: https://www.docker.com/products/docker-desktop)
2. **Docker Desktop 실행** → 트레이 아이콘 녹색
3. **WSL2 integration 활성화:**
   Docker Desktop → Settings → Resources → WSL Integration
   → "Enable integration with my default WSL distro" 체크
   → 사용 중인 distro 토글 ON → Apply & Restart

## 작업 시작 (집에서)

```bash
# 1. 저장소 clone (처음 1회만)
git clone git@github.com:Steel-yong/Infra-gitops.git
cd Infra-gitops

# 2. PUB-30 브랜치 받기
git fetch
git checkout feature/PUB-30
git pull

# 3. 도커로 전체 띄우기 (5~10분 첫 빌드)
docker compose up --build -d

# 4. 컨테이너 상태 확인
docker compose ps
```

5분 정도 기다린 후 브라우저로 `http://127.0.0.1:3000` 접속.

## 자동으로 처리되는 것

| 항목 | 자동 처리 여부 |
|------|------------|
| Postgres DB 생성 | ✅ |
| 마이그레이션 적용 | ✅ |
| **시드 데이터 (비밀창고 + 페이즈)** | ✅ (Dockerfile에 추가됨) |
| 4개 서비스 빌드 + 기동 | ✅ |

수동으로 할 것 = **0개**.

## 문제 해결

### Docker 명령 안 됨
```bash
docker --version  # 버전 출력되어야 함
```
안 되면 → Docker Desktop 실행 + WSL2 integration 확인.

### 비밀창고 마커가 안 보임
시드가 안 됐을 수 있음. 수동 시드:
```bash
docker exec feature-pub-30-location-1 sh -c "cd /repo/apps/services/location && pnpm exec ts-node --transpile-only -r tsconfig-paths/register prisma/seed.ts"
```

### 자기장 / 타이머가 OCR 인식 안 됨
F12 콘솔 보면 `[OCR] ...` 로그 있는지 확인.
없으면 → 페이지 새로고침 (Ctrl+F5) + 공유 시작.

### 다시 처음부터 (DB 등 전부 초기화)
```bash
docker compose down -v  # -v는 볼륨까지 삭제
docker compose up --build -d
```

## 변경 사항 GitHub로 보내기

```bash
git add <변경된 파일>
git commit -m "메시지"
git push
```

## 작업 현황 보기

상세 진행 보고서: `docs/resources/mockups/2026-05-14-status-report-pub30.html`
브라우저에서 열어보면 완료/미완료 작업, 설정값, 다음 우선순위 등이 정리되어 있음.

## 회사로 돌아와서 다시 이어가기

```bash
git pull  # 집에서 push한 거 받음
docker compose up --build -d
```
