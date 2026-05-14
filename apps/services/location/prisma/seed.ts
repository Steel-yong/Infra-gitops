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

  // 프로팀 더미 위치 데이터 (테스트용 — 실제 학습 데이터 삽입 전)
  type Tier = 'S' | 'A' | 'B';
  const ERANGEL_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [
    { id: 'er-pro-01', coordX: 0.50, coordY: 0.30, tier: 'S', teams: ['Gen.G'] },
    { id: 'er-pro-02', coordX: 0.35, coordY: 0.28, tier: 'S', teams: ['T1'] },
    { id: 'er-pro-03', coordX: 0.63, coordY: 0.40, tier: 'S', teams: ['DRX'] },
    { id: 'er-pro-04', coordX: 0.20, coordY: 0.35, tier: 'A', teams: ['Gen.G', 'T1'] },
    { id: 'er-pro-05', coordX: 0.75, coordY: 0.25, tier: 'A', teams: ['OGN Entus'] },
    { id: 'er-pro-06', coordX: 0.45, coordY: 0.55, tier: 'A', teams: ['BFG'] },
    { id: 'er-pro-07', coordX: 0.28, coordY: 0.50, tier: 'A', teams: ['DRX'] },
    { id: 'er-pro-08', coordX: 0.58, coordY: 0.22, tier: 'S', teams: ['Gen.G', 'DRX'] },
    { id: 'er-pro-09', coordX: 0.70, coordY: 0.48, tier: 'B', teams: ['T1'] },
    { id: 'er-pro-10', coordX: 0.15, coordY: 0.60, tier: 'B', teams: ['OGN Entus'] },
    { id: 'er-pro-11', coordX: 0.40, coordY: 0.70, tier: 'A', teams: ['Gen.G'] },
    { id: 'er-pro-12', coordX: 0.55, coordY: 0.65, tier: 'B', teams: ['BFG', 'DRX'] },
    { id: 'er-pro-13', coordX: 0.80, coordY: 0.55, tier: 'A', teams: ['T1'] },
    { id: 'er-pro-14', coordX: 0.25, coordY: 0.42, tier: 'S', teams: ['Gen.G'] },
    { id: 'er-pro-15', coordX: 0.48, coordY: 0.45, tier: 'S', teams: ['Gen.G', 'T1', 'DRX'] },
    { id: 'er-pro-16', coordX: 0.60, coordY: 0.75, tier: 'B', teams: ['OGN Entus'] },
    { id: 'er-pro-17', coordX: 0.33, coordY: 0.62, tier: 'A', teams: ['DRX'] },
    { id: 'er-pro-18', coordX: 0.72, coordY: 0.35, tier: 'A', teams: ['Gen.G'] },
    { id: 'er-pro-19', coordX: 0.42, coordY: 0.38, tier: 'S', teams: ['T1', 'Gen.G'] },
    { id: 'er-pro-20', coordX: 0.55, coordY: 0.50, tier: 'S', teams: ['Gen.G', 'T1', 'DRX', 'OGN Entus'] },
  ];

  const TAEGO_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [
    { id: 'tg-pro-01', coordX: 0.50, coordY: 0.40, tier: 'S', teams: ['Gen.G'] },
    { id: 'tg-pro-02', coordX: 0.35, coordY: 0.30, tier: 'S', teams: ['T1'] },
    { id: 'tg-pro-03', coordX: 0.65, coordY: 0.35, tier: 'S', teams: ['DRX'] },
    { id: 'tg-pro-04', coordX: 0.20, coordY: 0.45, tier: 'A', teams: ['Gen.G', 'T1'] },
    { id: 'tg-pro-05', coordX: 0.78, coordY: 0.30, tier: 'A', teams: ['OGN Entus'] },
    { id: 'tg-pro-06', coordX: 0.45, coordY: 0.58, tier: 'A', teams: ['BFG'] },
    { id: 'tg-pro-07', coordX: 0.30, coordY: 0.55, tier: 'A', teams: ['DRX'] },
    { id: 'tg-pro-08', coordX: 0.60, coordY: 0.25, tier: 'S', teams: ['Gen.G', 'DRX'] },
    { id: 'tg-pro-09', coordX: 0.72, coordY: 0.52, tier: 'B', teams: ['T1'] },
    { id: 'tg-pro-10', coordX: 0.15, coordY: 0.55, tier: 'B', teams: ['OGN Entus'] },
    { id: 'tg-pro-11', coordX: 0.42, coordY: 0.70, tier: 'A', teams: ['Gen.G'] },
    { id: 'tg-pro-12', coordX: 0.58, coordY: 0.65, tier: 'B', teams: ['BFG', 'DRX'] },
    { id: 'tg-pro-13', coordX: 0.82, coordY: 0.60, tier: 'A', teams: ['T1'] },
    { id: 'tg-pro-14', coordX: 0.28, coordY: 0.38, tier: 'S', teams: ['Gen.G'] },
    { id: 'tg-pro-15', coordX: 0.50, coordY: 0.50, tier: 'S', teams: ['Gen.G', 'T1', 'DRX'] },
    { id: 'tg-pro-16', coordX: 0.62, coordY: 0.78, tier: 'B', teams: ['OGN Entus'] },
    { id: 'tg-pro-17', coordX: 0.35, coordY: 0.65, tier: 'A', teams: ['DRX'] },
    { id: 'tg-pro-18', coordX: 0.70, coordY: 0.42, tier: 'A', teams: ['Gen.G'] },
    { id: 'tg-pro-19', coordX: 0.45, coordY: 0.35, tier: 'S', teams: ['T1', 'Gen.G'] },
    { id: 'tg-pro-20', coordX: 0.55, coordY: 0.45, tier: 'S', teams: ['Gen.G', 'T1', 'DRX', 'OGN Entus'] },
  ];

  // 기존 프로 더미 데이터 초기화 후 재삽입
  await prisma.location.deleteMany({
    where: {
      id: { startsWith: 'er-pro-' },
    },
  });
  await prisma.location.deleteMany({
    where: {
      id: { startsWith: 'tg-pro-' },
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

  console.log(`에란겔 프로 더미 ${ERANGEL_PRO.length}개 완료`);
  console.log(`태이고 프로 더미 ${TAEGO_PRO.length}개 완료`);
  console.log(`시드 완료 — CirclePhase 18개 + 비밀창고 ${ERANGEL_STASHES.length + TAEGO_STASHES.length}개 + 프로 더미 ${ERANGEL_PRO.length + TAEGO_PRO.length}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
