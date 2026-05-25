# 인프라 감사 보고서 — 2026-05-18

> 대상: `Infra-gitops` 단일 RKE2 클러스터 (`onprem-dev`) + PUBG Helper 앱.
> 시점: develop 브랜치 + `onprem-dev-test`(ArgoCD 타겟) 양쪽 모두 확인.
> 관점: 실무 K8s 플랫폼 엔지니어 + 풀스택/DevOps. 면접 어필 + 운영 안정성 두 축.

---

## 0. TL;DR — 지금 당장 알아야 할 3가지

> **사용자 정정 (2026-05-18):** 초안에 "브랜치 분기" 리스크로 적었으나 **이건 의도된 환경 분리**다. `develop`=순수 개발(docker-compose), `onprem-dev-test`=K8s 인프라 통합 dev 환경, `main`=최종 prod. 따라서 1번은 리스크가 아니라 정상 흐름. 아래는 정정 후 우선순위.

**① PUBG Helper 앱 K8s 매니페스트가 0개.** 인프라 11개 AppSet은 다 깔렸는데 정작 frontend / capture / location / alert 4개 서비스의 Deployment·Service·HTTPRoute·ApplicationSet **하나도 없음**. CI도 이미지 빌드/푸시/Trivy 스캔/ArgoCD sync 단계 전부 누락 — 사실상 lint + typecheck + test만 도는 PR 게이트. 단 **이건 의도된 상태** — develop에서 docker-compose로 빠르게 개발 중이고, 충분히 안정되면 onprem-dev-test 머지 시점에 K8s 매니페스트 작성 + CI 파이프라인 확장 예정. **그럼에도 "언제 onprem-dev-test로 올릴지" + "올리기 전에 무엇을 갖춰야 할지" 체크리스트는 미리 준비하는 게 안전**.

**② alert-service가 dead code.** Frontend는 클라이언트사이드 OCR(`useOcrTimer` → `useAlertTimer` → `Notification`)로 알림을 처리하고, `NEXT_PUBLIC_ALERT_SERVICE_URL` grep 결과 0건. 잘 작성된 NestJS WebSocket gateway가 **호출되지 않은 채 CI 비용만 소모 중**. 둘 중 하나 결정 필요: (a) 프론트엔드를 alert-service로 전환, (b) alert-service 제거.

**③ 외부 노출 중인데 staging cert로 서빙 중.** `components/cert-manager/cluster-issuer.yaml:11`이 letsencrypt-staging만 정의. onprem-dev-test의 Gateway가 cloudflared로 외부에 `*.yongun.shop` 노출 중이라 **브라우저 신뢰 안 되는 cert를 외부 사용자가 보고 있음**. 한 줄 추가(prod issuer)로 해결 가능.

---

## 1. 브랜치 환경 분리 (정정됨)

> **분기가 아니라 의도된 3단계 환경 분리.**

| 브랜치 | 역할 | 실행 환경 | 현재 상태 |
|---|---|---|---|
| `develop` | 순수 개발. 빠른 이터레이션. 버그 추적 쉬움 | docker-compose | 앱 개발 진행 중 |
| `onprem-dev-test` | develop 완료분 머지. K8s 인프라에 올려 통합 검증 | RKE2 onprem-dev 클러스터 (ArgoCD 타겟) | 인프라 준비됨, 앱 매니페스트 없음 |
| `main` | 최종 완성 후 머지 | (향후) prod | 미사용 |

**왜 이 구조인가:** 인프라가 어느 정도 갖춰졌어도 앱 개발이 많이 남았고, K8s 위에서 개발하면 버그 추적이 어렵다. 그래서 가벼운 docker-compose로 개발 후 안정되면 실제 인프라에 올림.

**onprem-dev-test에만 있는 것 (의도된 차이):**
- Prometheus + Grafana + 대시보드 6종 (kube-prometheus-stack)
- monitoring namespace
- Cilium Hubble HTTPRoute + ReferenceGrant
- `11-prometheus-appset.yaml`

**유의점 (실제 리스크):**
- develop → onprem-dev-test 머지 시점에 **앱 K8s 매니페스트 + Dockerfile 멀티스테이지 + CI 이미지 빌드/푸시 단계가 한꺼번에 필요**. 한 번에 다 만들면 무거우므로, develop 단계에서 미리 준비(아직 ArgoCD가 안 보더라도)해두는 게 안전.
- 두 브랜치가 너무 오래 떨어져 있으면 머지 충돌 + 인프라 변경 누락 위험. 주기적으로 `onprem-dev-test → develop` 역방향 rebase로 인프라 변경 가져오는 것 권장.

---

## 2. 인프라 매니페스트 정합성

### 2.1 Sync-Wave 실측

| 컴포넌트 | 계획서 wave | 실제 | 비고 |
|---|---|---|---|
| namespaces | -10 | -10 | 일치 |
| MetalLB | 0 | 0 | 일치 |
| cert-manager | 5 | 5 | 일치 |
| Longhorn | 10 | **7** | 앞당김. cert-manager 5와 너무 가까움 |
| Vault | (10 묶음) | 10 | 별도 wave로 분리 |
| ESO | 4단계 | 15 | OK |
| ArgoCD self-manage | 미명시 | 16 | self-management 정석 |
| envoy-gateway-system | 5단계 | 17 | |
| Gateway/HTTPRoute | 5단계 | 19 | |
| Cloudflared | 5단계 | 20 | ops/svc 2개로 분리 |
| Harbor | 6단계 | 22 | |
| Prometheus stack | "안함" | **25** (onprem-dev-test만) | 계획에 없으나 실제 운영 |
| Kyverno | 5 | **없음** | 미구현 |
| Argo Rollouts | 6단계 | **없음** | 미구현 |
| Falco / Trivy(독립) | 7단계 | **없음** (Harbor 내장 Trivy만) | 미구현 |
| Velero | 9단계 | **없음** | 미구현 |
| Loki / Tempo / OTel | 8단계 | **없음** | 미구현 |
| ClusterMesh | 11단계 | **없음** | 미구현 |

### 2.2 부트스트랩 체인의 약점
- `bootstrap/onprem-dev-root-app.yaml`은 ArgoCD가 이미 떠 있다는 전제 → **ArgoCD 자체는 manual helm install** 필요. 클러스터 재구축 자동화 불가.
- Cilium CNI Helm chart가 매니페스트에 없음 (`clusters/onprem-dev/cilium/`엔 Hubble HTTPRoute뿐). RKE2 부트스트랩 시 별도 설치 → **면접에서 "Cilium은 어떻게 설치?"에 "수동 helm install"로 답해야 함**.
- cert-manager Cloudflare DNS-01 솔버가 참조하는 `cloudflare-api-token-secret`을 가져오는 ExternalSecret이 리포 어디에도 없음. manual create 필요.
- 첫 부트스트랩 시 manual 개입 최소 3회: ArgoCD install → Vault unseal → Cloudflare API token secret 주입.

---

## 3. 컴포넌트별 디테일

| 컴포넌트 | 형태 | 핀 | HA | 비고 |
|---|---|---|---|---|
| MetalLB | Helm 0.15.3 + kustomize | ✅ | replicas 2 + PDB + system-cluster-critical | infra-pool .100~.120, dynamic-pool .200~.220 |
| cert-manager | Helm jetstack 1.20.1 | ✅ | 모든 컴포넌트 replicas 2 + PDB + topology spread | **Staging ClusterIssuer만 정의** (prod 없음) |
| Longhorn | Helm 1.11.1 | ✅ | replica 2 (PV) | 백업 타겟 미설정 |
| Vault | Helm 0.32.0 | ✅ | Raft 3 replicas + antiAffinity | **TLS 평문**, **autoUnseal 없음** |
| ESO | Helm 2.2.0 | ✅ | system-cluster-critical | ClusterSecretStore = `vault-cluster-store` (K8s SA 인증) |
| ArgoCD | Helm 9.4.16 | ✅ | **replica 1** | self-manage, `--insecure`, kustomize `--enable-helm` |
| Envoy Gateway | Helm 1.7.1 | ✅ | controller 2 + EnvoyProxy data plane 2 | `envoy-gateway-public` Service가 ClusterIP — MetalLB 미연결 의혹 |
| Gateway/HTTPRoute | Plain | - | - | HTTP→HTTPS redirect 없음, namespace selector `gateway-access=true` |
| Cloudflared (ops/svc) | Plain Deployment | ✅ 2026.3.0 | replicas 2 | **resources 미정의 → BestEffort QoS** |
| Harbor | Helm 1.18.3 | ✅ | portal/core/trivy 2 + PDB, jobservice/registry/exporter 1 | **DB PV 1Gi — prod 진입 시 부족** |
| Prometheus stack | Helm (onprem-dev-test) | ✅ | Grafana **replica 1** | **Alertmanager receiver = null** |

---

## 4. 보안 결함 (구체적 파일 인용)

1. **Staging-only ClusterIssuer** — `components/cert-manager/cluster-issuer.yaml:11` `acme-staging-v02.api.letsencrypt.org/directory`. 외부에 staging cert로 서빙 중 → 브라우저 신뢰 안 됨. **prod issuer 한 줄 추가가 가장 cheap한 fix**.
2. **Vault TLS 평문** — `components/vault/kustomization.yaml:46-50` `tls_disable = 1`. NetworkPolicy가 0개라 클러스터 내부 누구나 raft API 접근 가능.
3. **autoUnseal 미설정** — 노드 재시작 → 모든 Vault pod sealed → ESO refresh 실패 → 1시간 후 모든 ExternalSecret 갱신 멈춤 → Harbor / ArgoCD / cloudflared / grafana 시크릿 만료 시 장애 전파.
4. **NetworkPolicy 0개** — Cilium 운영 중이라 CiliumNetworkPolicy로 쉽게 도입 가능. 현재 Vault·Harbor DB·Longhorn manager 어디든 호출 가능. 외부에 Gateway+Cloudflare로 admin UI 다 노출 중이라 더 위험.
5. **Pod SecurityContext 누락** — cloudflared 2종 모두 `runAsNonRoot` / `readOnlyRootFilesystem` / `allowPrivilegeEscalation` 없음 (`clusters/onprem-dev/cloudflared-*/deployment.yaml`).
6. **`argocd.argoproj.io/sync-wave: "1"` on ClusterSecretStore** — `components/external-secrets/cluster-secret-store.yaml:5-6`. ESO chart 자체와 동일 wave(15)에 적용되므로 의미 없음. 의도와 다른 어노테이션.
7. **Argo CD NetworkPolicy 없음** — `--insecure` + ClusterIP는 표준 패턴이나 클러스터 내부 누구나 admin API 호출 가능.
8. **Frontend ESLint `no-console: 'warn'`** — `.eslintrc.js:12`. warn은 CI lint 통과시킴. CLAUDE.md "console.log 커밋 금지"가 강제되지 않음. `useLockedCircle.ts:28,33,41`, `useOcrTimer.ts`에 다수 잔존.

---

## 5. 가용성 / 운영 결함

1. **단일 마스터 control plane** — 학습 환경의 제약. master 디스크 손실 시 복구 불가.
2. **etcd 백업 부재** — RKE2가 6시간마다 로컬 snapshot 만들지만 외부 복제·보존·검증 매니페스트 없음.
3. **Velero 미설치** — etcd + PV 백업/복구 자동화 없음.
4. **로그 부재** — Loki 없음. ArgoCD/cloudflared/Harbor 장애 시 `kubectl logs`만으로 디버깅.
5. **트레이싱 부재** — Tempo 없음. NestJS 서비스 간 호출 추적 불가.
6. **Alertmanager receiver = null** — 알람이 어디로도 안 감. **Prometheus가 깔렸지만 실효성 0**.
7. **HA replica 부족** — ArgoCD server/controller/repo-server 모두 replica 1, Harbor jobservice/registry/exporter 1, Grafana 1.
8. **selfHeal: true 무한루프 위험** — Vault sealed 시 ESO 실패 → Secret 사라짐 → Helm `existingSecret` 참조 실패 → ArgoCD 재시도(limit 5).

---

## 6. 네트워크 / 트래픽 흐름

### 6.1 이중 진입점
```
인터넷 → Cloudflare → cloudflared(ops/svc tunnel) → 클러스터 내부 Service → Envoy Gateway → HTTPRoute → Pod
                                                  └─ MetalLB LB IP(.100) — 동작 의문
```

- `clusters/onprem-dev/envoy-gateway-system/service.yaml`의 `envoy-gateway-public` Service는 type 명시 없음(기본 ClusterIP) → MetalLB가 IP 부여 못 함. EnvoyProxy CR이 내부적으로 만든 LB Service가 별도로 있을 것으로 추정. **실제 EXTERNAL-IP 부여 흐름은 클러스터에서 `kubectl get svc -A | grep LoadBalancer`로 확인 필요**.
- HTTP listener에서 HTTPS redirect 없음 → 평문 HTTP 그대로 라우팅.

### 6.2 cloudflared ops/svc 분리
- 같은 namespace에 두 Deployment, 다른 TUNNEL_TOKEN.
- ops = argocd / vault / longhorn / grafana / hubble (admin 평면).
- svc = PUBG 서비스 평면.
- Cloudflare Zero Trust 정책을 ops 도메인에만 강제하기 위한 설계로 추정. **합리적**이나 매니페스트에 주석 없음 → 의도가 휘발성.

---

## 7. 앱 코드 / CI 격차

### 7.1 빌드 시스템
- 모든 Dockerfile **단일 스테이지 + root 유저 + `ts-node` 또는 `next dev` 실행**. 프로덕션 빌드 없음.
  - frontend: `next dev` (`apps/frontend/Dockerfile:21`)
  - capture: `pnpm dev` = ts-node (`apps/services/capture/Dockerfile:22`)
  - location: ts-node + 부팅마다 `prisma migrate deploy && seed.ts` (`apps/services/location/Dockerfile:28`)
  - alert: ts-node (`apps/services/alert/Dockerfile:23`)
- NestJS 표준(`nest-cli.json`, `nest build`) 미사용. 그냥 `tsc`. swc 빌드 가속 없음.
- shared 패키지 `main: "src/index.ts"` — `dist` 없이 ts 직접 export. 결과적으로 **프로덕션에서도 ts-node로 실행**(안티패턴).

### 7.2 CI (`.github/workflows/ci.yml`)
존재하는 잡:
- lint, typecheck, test-{capture,location,alert,frontend} (vitest 95% 임계 강제 — 실효성 있음).
- coverage-gate는 echo만 (cosmetic).

**없는 단계 (전부 신규 추가 필요):**
- Docker 이미지 빌드.
- Trivy / cosign / SBOM.
- Harbor login + push.
- ArgoCD sync trigger.
- Playwright E2E (CLAUDE.md 약속, 실제 없음).
- 인프라 매니페스트 검증 (kustomize build + kubeconform). **PR에서 잘못된 매니페스트가 onprem-dev-test로 머지되면 ArgoCD에서 실패** — PR 단계에서 잡으면 가장 cheap.

### 7.3 코드 품질 스폿체크
- **capture.gateway.ts**: `sessions` Map에 `OnGatewayDisconnect` 없음 → 클라이언트 끊겨도 항목 안 지워짐 → **메모리 누수**. alert.gateway.ts:42-45는 같은 패턴을 깔끔히 해결 → 일관성 결여.
- **capture.service.ts:11-13,32-38**: 모듈-level `debugFrameSaved` 플래그 + `/tmp/capture-debug-frame.jpg` 파일 저장. readonly fs 시 크래시, multi-instance에서 무의미.
- **circle.service.ts**: RANSAC 2000회 × 전체 점 = O(6M)/프레임. 2fps라 견디지만 동시 세션에선 burst 불가.
- **WebSocket payload**: base64 jpeg 전송 → 33% 추가 대역폭 + 매번 디코드. binary frame으로 전환 권장.
- **location**: 부팅 시 `prisma migrate deploy + seed` 실행 → K8s Job/initContainer로 분리 정석.
- **frontend `console.log` 다수 잔존** — CLAUDE.md 1부 위반.

---

## 8. 트레이드오프 평가

| 결정 | 평가 | 대안 |
|---|---|---|
| 단일 클러스터에 wave 11단계 AppSet | 학습/면접 가치 ↑, 운영 비용 ↑ (reconcile 부담) | 5~6개 wave로 합쳐도 동일 효과 |
| Helm chart를 Kustomize로 감싸기 | 환경별 patch 용이, `--enable-helm` 의존 → 인지비용 ↑. **이미 일부 컴포넌트(harbor/envoy/prometheus)는 multi-source $values 패턴으로 분리** → 통일 권장 | 순수 Helm Application + multi-source values 패턴으로 통일 |
| 클러스터 내부 Vault | 면접 어필 ↑, 자기참조 위험 (sealed → ESO 실패 → 회복 불가) | (a) Bitwarden Secrets Manager + ESO (b) SOPS + age (가장 단순) (c) HCP Vault Cloud (유료) |
| Cloudflared + Envoy Gateway 이중 진입점 | DDoS/WAF 무료 + 공인IP 없이 외부 노출. Gateway API 학습 가능 | Cloudflared만 — Envoy 제거 가능 |
| Self-hosted Harbor | 면접 어필, 사설 이미지, Trivy 내장. PV 17Gi + 운영 부담 | ghcr.io free + Trivy GitHub Action — 무료, 운영 0 |
| 전 AppSet `prune:true + selfHeal:true` | drift 자동 복구, 운영 안정성 ↑. dev엔 적절 | prod 환경엔 sync window 권장 (특히 stateful) |
| Staging-only ClusterIssuer | dev 환경엔 OK. 하지만 외부 노출 중이라 브라우저 경고 | letsencrypt-prod 동시 정의 + Certificate에서 명시적 선택 |
| 단일 마스터 RKE2 | 학습 비용 ↓, 면접 시 단점 명확히 설명 가능 | 3-master HA — WSL2 리소스로 어려움 |
| alert-service 분리 | NestJS WebSocket 학습 좋음. 그러나 **frontend가 사용 안 함** → dead code | 제거하거나 frontend를 alert-service로 전환 |

---

## 9. 우선순위 권고 (점수 = 영향 ÷ 비용, 둘 다 1~5)

> **두 트랙으로 분리 권고 — "develop에서 지금 하기" vs "onprem-dev-test 머지 직전 하기".**

### 트랙 A — `develop`에서 지금 (앱 개발 중에도 가능)

| 순위 | 권고 | 영향 | 비용 | 점수 | 비고 |
|---|---|---|---|---|---|
| A1 | **alert-service 결정** (전환 or 제거) | 4 | 1 | 4.0 | dead code 방치하면 CI/리뷰 비용 누적. 결정만 빠르게 |
| A2 | **capture.gateway.ts에 `OnGatewayDisconnect` 추가 + /tmp 디버그 제거** | 4 | 1 | 4.0 | 메모리 누수 + readonly fs 대응. K8s 가기 전에 잡아야 |
| A3 | **frontend `console.log` 일괄 제거 + ESLint `no-console: 'error'` 승격** | 3 | 1 | 3.0 | CLAUDE.md 1부 직접 위반 중 |
| A4 | **WebSocket payload binary 전환** (base64 → ArrayBuffer) | 3 | 2 | 1.5 | 33% 대역폭 + 디코드 비용. dev 환경에서 충분히 테스트 가능 |
| A5 | **CI에 kustomize build + kubeconform 검증 잡 추가** | 4 | 1 | 4.0 | 인프라 매니페스트 PR 검증 0건. develop에서 onprem-dev-test로 머지 PR 만들 때 안전망 |

### 트랙 B — `onprem-dev-test` 머지 시 함께 (앱이 GitOps 진입할 때 한꺼번에)

| 순위 | 권고 | 영향 | 비용 | 점수 | 비고 |
|---|---|---|---|---|---|
| B1 | **PUBG Helper 앱 K8s 매니페스트 작성 + ApplicationSet 등록** | 5 | 3 | 1.67 | 머지 직전에 한 번에 |
| B2 | **Dockerfile 멀티스테이지 + non-root + 빌드 산출물** | 5 | 3 | 1.67 | ts-node/next dev → 프로덕션 빌드 전환 |
| B3 | **CI에 docker build + Trivy + Harbor push + ArgoCD sync trigger 추가** | 5 | 3 | 1.67 | 트랙 A의 A5와 짝 |
| B4 | **location 부팅 시 prisma migrate + seed → K8s Job/initContainer 분리** | 3 | 2 | 1.5 | 매 부팅 재실행 안티패턴 |
| B5 | **각 서비스 liveness/readiness probe 분리** (capture/alert는 단순 ok, location은 DB ping) | 3 | 1 | 3.0 | 매니페스트 작성 시 함께 |

### 트랙 C — 인프라 자체 개선 (트랙과 무관, 언제든)

| 순위 | 권고 | 영향 | 비용 | 점수 | 비고 |
|---|---|---|---|---|---|
| C1 | **prod ClusterIssuer 추가** + Certificate prod로 전환 | 5 | 1 | 5.0 | 한 줄. 외부에 staging cert 서빙 중 |
| C2 | **Alertmanager receiver Discord/Slack 연결** | 4 | 1 | 4.0 | Prometheus 깔렸지만 알람 효과 0 |
| C3 | **NetworkPolicy 기본 default-deny** | 5 | 2 | 2.5 | Vault 평문 + 외부 노출 중. Cilium 사용 중이라 CiliumNetworkPolicy로 쉬움 |
| C4 | **Cilium CNI 매니페스트화** | 4 | 2 | 2.0 | 부트스트랩 자동화 |
| C5 | **etcd snapshot off-cluster 백업** (CronJob + rclone) | 5 | 3 | 1.67 | 마스터 디스크 손실 유일 복구 수단 |
| C6 | **Loki + Promtail** | 4 | 3 | 1.33 | 디버깅 효율. 트랙 B 머지 직후 우선순위 ↑ |
| C7 | **ArgoCD HA replica + Redis HA** | 3 | 2 | 1.5 | self-manage라 더 중요 |
| C8 | **Vault autoUnseal** (transit) | 4 | 4 | 1.0 | 비용 큼, 학습 목적이면 후순위 |

---

## 10. "면접에서 깎일 포인트" 우선 정리

면접 어필 + 실무 환경 재현이 본 프로젝트 목적이라면 다음이 우선:

1. **"인프라는 있는데 앱 배포 매니페스트가 없음."** 가장 먼저 지적당함.
2. **"console.log·debug 파일 잔존."** 코드 디테일 점검 시 즉시 보임.
3. **"Cilium은 어떻게 설치?"에 "수동 helm install"** — GitOps 재현성 결여.
4. **"prod cert 없이 staging 서빙 중"** — 한 줄 추가로 해결 가능한 걸 안 한 것.
5. **"Alertmanager 깔았는데 알람 안 보냄"** — 모니터링 흉내만 낸 상태로 보임.
6. **"etcd 백업 어떻게?"** — 답이 RKE2 기본 snapshot뿐.
7. **"브랜치 둘로 분기"** — GitOps 규율 부재로 해석될 수 있음.

---

## 11. 다음 액션 (브랜치 환경별)

### develop에서 지금 (앱 개발 중에도 부담 적음)
- [ ] alert-service 결정 — frontend로 전환 vs 제거 (논의 필요)
- [ ] capture.gateway.ts `OnGatewayDisconnect` + `/tmp` 디버그 제거 (~30분)
- [ ] frontend `console.log` 제거 + `no-console: 'error'` 승격 (~30분)
- [ ] CI에 kustomize + kubeconform validate 잡 추가 (~1시간)

### 인프라 트랙 (onprem-dev-test 직접 작업, 트랙 무관)
- [ ] prod ClusterIssuer 추가 + Certificate 전환 (~30분, 가장 cheap한 win)
- [ ] Alertmanager Discord webhook 연결 (~1시간)
- [ ] NetworkPolicy default-deny + 컴포넌트별 allow (~반나절)
- [ ] Cilium CNI 매니페스트화 (~1~2시간)
- [ ] etcd snapshot off-cluster CronJob (~반나절)

### develop → onprem-dev-test 머지 직전 (한 묶음)
- [ ] PUBG Helper 4서비스 K8s 매니페스트 + ApplicationSet 작성
- [ ] Dockerfile 4종 멀티스테이지 + non-root 재작성
- [ ] CI에 docker build + Harbor push + Trivy 단계 추가
- [ ] location prisma migrate/seed를 K8s Job/initContainer로 분리
- [ ] liveness/readiness probe 작성

### 점진 (when ready)
- [ ] Loki + Promtail
- [ ] ArgoCD HA + Redis HA
- [ ] Playwright E2E
- [ ] Vault autoUnseal (cloud 계정 확보 후)

---

## 13. develop → onprem-dev-test 머지 전 체크리스트

> 머지 시점에 한 번에 들고 가야 할 항목. 미리 develop에서 작성해두고, 머지 시 활성화.

**앱 측:**
- [ ] 4개 서비스 모두 Dockerfile 멀티스테이지 (build 스테이지 + runtime 스테이지)
- [ ] 모든 Dockerfile `USER node` (non-root)
- [ ] frontend: `next build && next start` (next dev 아님)
- [ ] capture/location/alert: `nest build` 산출물 (`dist/main.js`) 실행, ts-node 제거
- [ ] shared 패키지 `dist` 빌드 + `main: dist/index.js`로 전환
- [ ] location prisma migrate/seed를 별도 K8s Job 또는 initContainer로 분리

**K8s 매니페스트:**
- [ ] `clusters/onprem-dev/apps/{frontend,capture,location,alert}/` 디렉토리 신설
- [ ] 각 서비스 Deployment + Service + HTTPRoute
- [ ] resource requests/limits 명시 (특히 capture는 이미지 처리 부하)
- [ ] liveness/readiness probe (capture/alert는 단순 /health, location은 DB ping)
- [ ] 이미지 경로는 `harbor.kim-dev.com/pubg-helper/{service}:{git-sha}`
- [ ] env는 ConfigMap, secret은 ExternalSecret으로 분리
- [ ] `applicationsets/onprem-dev/12-apps-appset.yaml` (wave 50) 신설

**CI:**
- [ ] docker buildx + multi-arch 또는 amd64 단일
- [ ] Trivy scan (HIGH/CRITICAL fail)
- [ ] Harbor login + push (태그: git sha + latest는 develop branch만)
- [ ] ArgoCD webhook trigger 또는 image updater 연결
- [ ] self-hosted runner 옵션 (Harbor 내부 접근 위해 필요할 수도)

**점검:**
- [ ] alert-service 결정 사항 반영 (사용 안 하면 매니페스트도 안 만듦)
- [ ] frontend가 service 도메인을 어떻게 부르는지 — Gateway 경유? 직접?
- [ ] WebSocket sticky session 필요 여부 (capture/alert)

---

## 12. 부록 — 검증되지 않은 가정 (직접 확인 필요)

- `envoy-gateway-public` Service가 실제로 EXTERNAL-IP를 받는지 (매니페스트만으로는 동작 불명).
- Vault에 ESO가 참조하는 secret key들이 실제 존재하는지 (특히 `HARBOR_ADMIN_PASSWORD`, `cloudflared-ops/svc` tunnel token).
- Cloudflare 대시보드의 tunnel 라우팅 설정 (ops/svc 도메인 매핑).
- `origin/onprem-dev-test`와 로컬 `onprem-dev-test`의 동기화 상태.
- prisma seed가 실제 idempotent한지.
