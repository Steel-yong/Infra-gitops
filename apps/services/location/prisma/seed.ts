// 에란겔 + 태이고 맵 데이터 + 자기장 페이즈 타이밍 시드
// 좌표계: PUBG 공식 API 기준 0-816,000 cm → 0-1 정규화 (coordX = X_cm / 816000)
// 자기장 타이밍 출처: pubg.wiki.gg/wiki/The_Playzone (2026-05-12 기준)
import { PrismaClient, MapType } from '@prisma/client';

const prisma = new PrismaClient();

// 에란겔 자기장 페이즈 타이밍 (pubg.wiki.gg 공식 수치, Normal=Ranked Patch 23.1 이후 동일)
// waitSeconds   = 이전 페이즈 종료 후 다음 자기장이 맵에 표시되기까지 대기 시간 (Delay)
// shrinkSeconds = 자기장 표시 후 실제로 수축 시작까지 플레이어에게 보여지는 카운트다운 시간
const ERANGEL_PHASES = [
  { phaseNumber: 1, waitSeconds: 120, shrinkSeconds: 270 },
  { phaseNumber: 2, waitSeconds: 0,   shrinkSeconds: 180 },
  { phaseNumber: 3, waitSeconds: 0,   shrinkSeconds: 130 },
  { phaseNumber: 4, waitSeconds: 0,   shrinkSeconds: 120 },
  { phaseNumber: 5, waitSeconds: 0,   shrinkSeconds: 100 },
  { phaseNumber: 6, waitSeconds: 0,   shrinkSeconds: 90  },
  { phaseNumber: 7, waitSeconds: 0,   shrinkSeconds: 70  },
  { phaseNumber: 8, waitSeconds: 0,   shrinkSeconds: 60  },
  { phaseNumber: 9, waitSeconds: 30,  shrinkSeconds: 30  },
] as const;

// 태이고 자기장 페이즈 타이밍
// Phase 1: Update 13.2에서 단축 확인 ("first phase was too long" → reduced)
//   → shrinkSeconds 90s 사용 (공식 수치 미공개, 추정치)
// Phase 2-9: 에란겔과 동일 (Patch 23.1 이후 통일)
const TAEGO_PHASES = [
  { phaseNumber: 1, waitSeconds: 120, shrinkSeconds: 90  }, // 에란겔 270s → 단축
  { phaseNumber: 2, waitSeconds: 0,   shrinkSeconds: 180 },
  { phaseNumber: 3, waitSeconds: 0,   shrinkSeconds: 130 },
  { phaseNumber: 4, waitSeconds: 0,   shrinkSeconds: 120 },
  { phaseNumber: 5, waitSeconds: 0,   shrinkSeconds: 100 },
  { phaseNumber: 6, waitSeconds: 0,   shrinkSeconds: 90  },
  { phaseNumber: 7, waitSeconds: 0,   shrinkSeconds: 70  },
  { phaseNumber: 8, waitSeconds: 0,   shrinkSeconds: 60  },
  { phaseNumber: 9, waitSeconds: 30,  shrinkSeconds: 30  },
] as const;

async function main(): Promise<void> {
  // 맵 레코드 upsert
  const erangel = await prisma.map.upsert({
    where: { type: MapType.erangel },
    update: {},
    create: { type: MapType.erangel, name: '에란겔' },
  });

  const taego = await prisma.map.upsert({
    where: { type: MapType.taego },
    update: {},
    create: { type: MapType.taego, name: '태이고' },
  });

  // 에란겔 CirclePhase 시드
  for (const phase of ERANGEL_PHASES) {
    await prisma.circlePhase.upsert({
      where: {
        // Prisma는 복합 unique 없으면 upsert에 id 필요 — 결정적 id 생성
        id: `erangel-phase-${phase.phaseNumber}`,
      },
      update: {
        waitSeconds: phase.waitSeconds,
        shrinkSeconds: phase.shrinkSeconds,
      },
      create: {
        id: `erangel-phase-${phase.phaseNumber}`,
        mapId: erangel.id,
        phaseNumber: phase.phaseNumber,
        waitSeconds: phase.waitSeconds,
        shrinkSeconds: phase.shrinkSeconds,
      },
    });
  }

  // 태이고 CirclePhase 시드
  for (const phase of TAEGO_PHASES) {
    await prisma.circlePhase.upsert({
      where: {
        id: `taego-phase-${phase.phaseNumber}`,
      },
      update: {
        waitSeconds: phase.waitSeconds,
        shrinkSeconds: phase.shrinkSeconds,
      },
      create: {
        id: `taego-phase-${phase.phaseNumber}`,
        mapId: taego.id,
        phaseNumber: phase.phaseNumber,
        waitSeconds: phase.waitSeconds,
        shrinkSeconds: phase.shrinkSeconds,
      },
    });
  }

  console.log(`에란겔 CirclePhase ${ERANGEL_PHASES.length}개 완료`);
  console.log(`태이고 CirclePhase ${TAEGO_PHASES.length}개 완료`);

  // 비밀창고 위치 시드 — 에란겔 비밀창고 위치.png 빨간 동그라미 픽셀 추출 (4096×4096 기준)
  // coordX = 서→동, coordY = 북→남, 0~1 정규화
  const ERANGEL_STASHES = [
    { id: 'erangel-stash-01', coordX: 0.6257, coordY: 0.0818 }, // Stalber 북쪽
    { id: 'erangel-stash-02', coordX: 0.1682, coordY: 0.2216 }, // Zharki 근처
    { id: 'erangel-stash-03', coordX: 0.5037, coordY: 0.2402 }, // Shooting Range 근처
    { id: 'erangel-stash-04', coordX: 0.7971, coordY: 0.2537 }, // Kameshki 근처
    { id: 'erangel-stash-05', coordX: 0.3164, coordY: 0.2702 }, // Georgopol 동쪽
    { id: 'erangel-stash-06', coordX: 0.6676, coordY: 0.4182 }, // Shelter 근처
    { id: 'erangel-stash-07', coordX: 0.1808, coordY: 0.4325 }, // Gatka 근처
    { id: 'erangel-stash-08', coordX: 0.3677, coordY: 0.4585 }, // Pochinki 근처
    { id: 'erangel-stash-09', coordX: 0.5691, coordY: 0.5404 }, // Mylta 근처
    { id: 'erangel-stash-10', coordX: 0.8251, coordY: 0.5976 }, // Mylta Power 근처
    { id: 'erangel-stash-11', coordX: 0.3344, coordY: 0.6292 }, // 서해안 남부
    { id: 'erangel-stash-12', coordX: 0.1538, coordY: 0.6754 }, // Primorsk 근처
    { id: 'erangel-stash-13', coordX: 0.5372, coordY: 0.7225 }, // Sosnovka 북쪽
    { id: 'erangel-stash-14', coordX: 0.4033, coordY: 0.8184 }, // Sosnovka Military Base
    { id: 'erangel-stash-15', coordX: 0.6926, coordY: 0.8218 }, // Novorepnoye 근처
  ] as const;

  const TAEGO_STASHES = [
    { id: 'taego-stash-01', coordX: 0.1736, coordY: 0.1453 }, // Wei Song 북서
    { id: 'taego-stash-02', coordX: 0.3182, coordY: 0.1659 }, // Wei Song 동쪽
    { id: 'taego-stash-03', coordX: 0.5913, coordY: 0.2076 }, // Army Base/Yong Cheon
    { id: 'taego-stash-04', coordX: 0.4368, coordY: 0.2399 }, // Go Dok 근처
    { id: 'taego-stash-05', coordX: 0.8452, coordY: 0.2555 }, // Shipyard 근처
    { id: 'taego-stash-06', coordX: 0.1536, coordY: 0.3309 }, // Hae Moo So 근처
    { id: 'taego-stash-07', coordX: 0.8732, coordY: 0.4130 }, // 동해안 중부
    { id: 'taego-stash-08', coordX: 0.7367, coordY: 0.4760 }, // Kang Neung 근처
    { id: 'taego-stash-09', coordX: 0.5426, coordY: 0.6091 }, // Ho San 근처
    { id: 'taego-stash-10', coordX: 0.1201, coordY: 0.6449 }, // Ho Po 근처
    { id: 'taego-stash-11', coordX: 0.7838, coordY: 0.6819 }, // Oh Hyang 근처
    { id: 'taego-stash-12', coordX: 0.6072, coordY: 0.7863 }, // 남부
    { id: 'taego-stash-13', coordX: 0.2965, coordY: 0.7921 }, // Song Am 근처
    { id: 'taego-stash-14', coordX: 0.7780, coordY: 0.8829 }, // 남동 해안
  ] as const;

  // 기존 stash 데이터 초기화 후 재삽입 (좌표 수 변경 대응)
  await prisma.location.deleteMany({
    where: {
      mapId: { in: [erangel.id, taego.id] },
      proTeamNames: { has: '비밀창고' },
    },
  });

  for (const stash of ERANGEL_STASHES) {
    await prisma.location.create({
      data: {
        id: stash.id,
        mapId: erangel.id,
        coordX: stash.coordX,
        coordY: stash.coordY,
        tier: 'S',
        proTeamNames: ['비밀창고'],
        usageCount: 0,
      },
    });
  }

  for (const stash of TAEGO_STASHES) {
    await prisma.location.create({
      data: {
        id: stash.id,
        mapId: taego.id,
        coordX: stash.coordX,
        coordY: stash.coordY,
        tier: 'S',
        proTeamNames: ['비밀창고'],
        usageCount: 0,
      },
    });
  }

  console.log(`에란겔 비밀창고 ${ERANGEL_STASHES.length}개 완료`);
  console.log(`태이고 비밀창고 ${TAEGO_STASHES.length}개 완료`);

  // ── 에란겔 명당 — PUB-35 v6 격자 셀 (PUBG 인게임 표기 AI~HP) ──
  // 53 영상, 마커 44,297, 8×8 격자, 사용자 calibration 1~2px 정확
  // 검증: 포친키=DM, 야스나야=EJ, 학교=EL, 군사기지=DO, 미타=GM 5/6 ✓
  // 39곳 (매치 ≥3, 마커 ≥10), tier: S=50+매치 / A=20~49 / B=3~19
  type Tier = 'S' | 'A' | 'B';
  const ERANGEL_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [
    { id: 'er-pws-001', coordX: 0.4260, coordY: 0.6918, tier: 'S', teams: ['DN 능선/외각 127매치'] },
    { id: 'er-pws-002', coordX: 0.3275, coordY: 0.6745, tier: 'S', teams: ['CN 능선/외각 88매치'] },
    { id: 'er-pws-003', coordX: 0.5587, coordY: 0.6825, tier: 'S', teams: ['EN 능선/외각 113매치'] },
    { id: 'er-pws-004', coordX: 0.5616, coordY: 0.5592, tier: 'S', teams: ['EM 외곽 작은마을 109매치'] },
    { id: 'er-pws-005', coordX: 0.6841, coordY: 0.5780, tier: 'S', teams: ['FM 능선/외각 85매치'] },
    { id: 'er-pws-006', coordX: 0.4394, coordY: 0.4378, tier: 'S', teams: ['DL 능선/외각 97매치'] },
    { id: 'er-pws-007', coordX: 0.5531, coordY: 0.4424, tier: 'S', teams: ['EL 능선/외각 97매치'] },
    { id: 'er-pws-008', coordX: 0.4425, coordY: 0.3240, tier: 'S', teams: ['DK 능선/외각 85매치'] },
    { id: 'er-pws-009', coordX: 0.4371, coordY: 0.5530, tier: 'S', teams: ['DM 외곽 작은마을 100매치'] },
    { id: 'er-pws-010', coordX: 0.6649, coordY: 0.6946, tier: 'S', teams: ['FN 외곽 작은마을 93매치'] },
    { id: 'er-pws-011', coordX: 0.3299, coordY: 0.5674, tier: 'S', teams: ['CM 능선/외각 90매치'] },
    { id: 'er-pws-012', coordX: 0.4602, coordY: 0.8135, tier: 'S', teams: ['DO 능선/외각 75매치'] },
    { id: 'er-pws-013', coordX: 0.5649, coordY: 0.3159, tier: 'S', teams: ['EK 외곽 작은마을 88매치'] },
    { id: 'er-pws-014', coordX: 0.3472, coordY: 0.7861, tier: 'S', teams: ['CO 능선/외각 64매치'] },
    { id: 'er-pws-015', coordX: 0.6938, coordY: 0.4375, tier: 'S', teams: ['FL 외곽 작은마을 83매치'] },
    { id: 'er-pws-016', coordX: 0.7881, coordY: 0.5688, tier: 'S', teams: ['GM 능선/외각 55매치'] },
    { id: 'er-pws-017', coordX: 0.5581, coordY: 0.1833, tier: 'S', teams: ['EJ 외곽 작은마을 64매치'] },
    { id: 'er-pws-018', coordX: 0.3377, coordY: 0.3243, tier: 'S', teams: ['CK 능선/외각 50매치'] },
    { id: 'er-pws-019', coordX: 0.5725, coordY: 0.8160, tier: 'S', teams: ['EO 대도시 74매치'] },
    { id: 'er-pws-020', coordX: 0.6922, coordY: 0.8227, tier: 'S', teams: ['FO 대도시 93매치'] },
    { id: 'er-pws-021', coordX: 0.6909, coordY: 0.1951, tier: 'S', teams: ['FJ 외곽 작은마을 56매치'] },
    { id: 'er-pws-022', coordX: 0.3236, coordY: 0.2001, tier: 'A', teams: ['CJ 능선/외각 39매치'] },
    { id: 'er-pws-023', coordX: 0.4366, coordY: 0.1994, tier: 'S', teams: ['DJ 대도시 62매치'] },
    { id: 'er-pws-024', coordX: 0.3295, coordY: 0.4489, tier: 'S', teams: ['CL 대도시 71매치'] },
    { id: 'er-pws-025', coordX: 0.6828, coordY: 0.3142, tier: 'S', teams: ['FK 대도시 61매치'] },
    { id: 'er-pws-026', coordX: 0.7756, coordY: 0.4371, tier: 'A', teams: ['GL 외곽 작은마을 37매치'] },
    { id: 'er-pws-027', coordX: 0.5439, coordY: 0.0984, tier: 'A', teams: ['EI 외곽 작은마을 41매치'] },
    { id: 'er-pws-028', coordX: 0.8026, coordY: 0.7942, tier: 'A', teams: ['GO 외곽 작은마을 37매치'] },
    { id: 'er-pws-029', coordX: 0.5523, coordY: 0.9222, tier: 'A', teams: ['EP 대도시 42매치'] },
    { id: 'er-pws-030', coordX: 0.7870, coordY: 0.3231, tier: 'B', teams: ['GK 외곽 작은마을 19매치'] },
    { id: 'er-pws-031', coordX: 0.7862, coordY: 0.6799, tier: 'A', teams: ['GN 대도시 36매치'] },
    { id: 'er-pws-032', coordX: 0.4326, coordY: 0.8976, tier: 'A', teams: ['DP 대도시 37매치'] },
    { id: 'er-pws-033', coordX: 0.4678, coordY: 0.1006, tier: 'A', teams: ['DI 능선/외각 27매치'] },
    { id: 'er-pws-034', coordX: 0.6899, coordY: 0.0719, tier: 'A', teams: ['FI 대도시 32매치'] },
    { id: 'er-pws-035', coordX: 0.7939, coordY: 0.2059, tier: 'B', teams: ['GJ 외곽 작은마을 16매치'] },
    { id: 'er-pws-036', coordX: 0.8107, coordY: 0.0454, tier: 'B', teams: ['GI 능선/외각 15매치'] },
    { id: 'er-pws-037', coordX: 0.3322, coordY: 0.9079, tier: 'B', teams: ['CP 능선/외각 10매치'] },
    { id: 'er-pws-038', coordX: 0.6699, coordY: 0.8978, tier: 'B', teams: ['FP 외곽 작은마을 8매치'] },
    { id: 'er-pws-039', coordX: 0.3218, coordY: 0.0963, tier: 'B', teams: ['CI 능선/외각 4매치'] },
  ];

  // ── 태이고 명당 — PUB-35 영상 분석 후속 작업 (PUB-36) ──
  // 현재 영상 23개 중 태이고 매치는 yETU 매치 4개만 식별됨 (전체 ~3매치).
  // 데이터 부족 → 별도 영상 배치 + 매치 분류 v5 정확도 향상 후 채울 예정.
  const TAEGO_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [];

  // 기존 프로 데이터 초기화 (더미 'er-pro-/tg-pro-' + 이전 PWS 'er-pws-' 모두 정리 후 재삽입)
  await prisma.location.deleteMany({
    where: {
      OR: [
        { id: { startsWith: 'er-pro-' } },
        { id: { startsWith: 'er-pws-' } },
        { id: { startsWith: 'tg-pro-' } },
        { id: { startsWith: 'tg-pws-' } },
      ],
    },
  });

  for (const loc of ERANGEL_PRO) {
    await prisma.location.create({
      data: {
        id: loc.id,
        mapId: erangel.id,
        coordX: loc.coordX,
        coordY: loc.coordY,
        tier: loc.tier,
        proTeamNames: loc.teams,
        usageCount: Math.floor(Math.random() * 50) + 5,
      },
    });
  }

  for (const loc of TAEGO_PRO) {
    await prisma.location.create({
      data: {
        id: loc.id,
        mapId: taego.id,
        coordX: loc.coordX,
        coordY: loc.coordY,
        tier: loc.tier,
        proTeamNames: loc.teams,
        usageCount: Math.floor(Math.random() * 50) + 5,
      },
    });
  }

  console.log(`에란겔 프로 명당 ${ERANGEL_PRO.length}개 완료 (PUB-35 영상 분석)`);
  console.log(`태이고 프로 명당 ${TAEGO_PRO.length}개 완료 (PUB-36 후속)`);
  console.log(`시드 완료 — CirclePhase 18개 + 비밀창고 ${ERANGEL_STASHES.length + TAEGO_STASHES.length}개 + 명당 ${ERANGEL_PRO.length + TAEGO_PRO.length}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
