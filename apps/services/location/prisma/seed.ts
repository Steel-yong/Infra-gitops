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

  // 비밀창고 위치 시드 (이미지 기반 좌표 — 0~1 정규화)
  // coordX = 서→동, coordY = 북→남
  const ERANGEL_STASHES = [
    { id: 'erangel-stash-01', coordX: 0.08, coordY: 0.18 }, // Zharki 북쪽 해안
    { id: 'erangel-stash-02', coordX: 0.03, coordY: 0.37 }, // 서해안 (Georgopol 북서)
    { id: 'erangel-stash-03', coordX: 0.15, coordY: 0.27 }, // Georgopol 동쪽
    { id: 'erangel-stash-04', coordX: 0.33, coordY: 0.16 }, // Shooting Range 근처
    { id: 'erangel-stash-05', coordX: 0.79, coordY: 0.08 }, // Stalber 근처
    { id: 'erangel-stash-06', coordX: 0.88, coordY: 0.16 }, // Kameshki 근처
    { id: 'erangel-stash-07', coordX: 0.22, coordY: 0.40 }, // Gatka 근처
    { id: 'erangel-stash-08', coordX: 0.35, coordY: 0.39 }, // Pochinki 서쪽
    { id: 'erangel-stash-09', coordX: 0.58, coordY: 0.44 }, // Shelter 근처
    { id: 'erangel-stash-10', coordX: 0.80, coordY: 0.33 }, // Lipovka 근처
    { id: 'erangel-stash-11', coordX: 0.90, coordY: 0.45 }, // Mylta Power 근처
    { id: 'erangel-stash-12', coordX: 0.68, coordY: 0.49 }, // Mylta 근처
    { id: 'erangel-stash-13', coordX: 0.27, coordY: 0.56 }, // Gatka 남쪽
    { id: 'erangel-stash-14', coordX: 0.04, coordY: 0.65 }, // 서해안 남부
    { id: 'erangel-stash-15', coordX: 0.12, coordY: 0.73 }, // Primorsk 근처
    { id: 'erangel-stash-16', coordX: 0.40, coordY: 0.80 }, // Sosnova Military Base 서쪽
    { id: 'erangel-stash-17', coordX: 0.62, coordY: 0.79 }, // Novorepnoye 서쪽
  ] as const;

  const TAEGO_STASHES = [
    { id: 'taego-stash-01', coordX: 0.07, coordY: 0.14 }, // Wei Song 서해안
    { id: 'taego-stash-02', coordX: 0.20, coordY: 0.11 }, // Wei Song 중심
    { id: 'taego-stash-03', coordX: 0.36, coordY: 0.13 }, // Army Base 남쪽
    { id: 'taego-stash-04', coordX: 0.82, coordY: 0.08 }, // Shipyard 상단
    { id: 'taego-stash-05', coordX: 0.88, coordY: 0.22 }, // 동해안 상단
    { id: 'taego-stash-06', coordX: 0.90, coordY: 0.37 }, // 동해안 중단
    { id: 'taego-stash-07', coordX: 0.24, coordY: 0.22 }, // Go Dok 근처
    { id: 'taego-stash-08', coordX: 0.47, coordY: 0.17 }, // Yong Cheon 근처
    { id: 'taego-stash-09', coordX: 0.47, coordY: 0.43 }, // Terminal 근처
    { id: 'taego-stash-10', coordX: 0.68, coordY: 0.46 }, // Kang Neung 근처
    { id: 'taego-stash-11', coordX: 0.07, coordY: 0.52 }, // Ho Po 근처
    { id: 'taego-stash-12', coordX: 0.33, coordY: 0.58 }, // Ho San / Fishing Camp
    { id: 'taego-stash-13', coordX: 0.22, coordY: 0.72 }, // Ho San Prison 근처
    { id: 'taego-stash-14', coordX: 0.38, coordY: 0.81 }, // Song Am 근처
    { id: 'taego-stash-15', coordX: 0.50, coordY: 0.71 }, // Bok Gol Sa 근처
    { id: 'taego-stash-16', coordX: 0.65, coordY: 0.76 }, // Oh Hyang 근처
    { id: 'taego-stash-17', coordX: 0.80, coordY: 0.89 }, // 남동 해안
  ] as const;

  for (const stash of ERANGEL_STASHES) {
    await prisma.location.upsert({
      where: { id: stash.id },
      update: { coordX: stash.coordX, coordY: stash.coordY },
      create: {
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
    await prisma.location.upsert({
      where: { id: stash.id },
      update: { coordX: stash.coordX, coordY: stash.coordY },
      create: {
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
  console.log(`시드 완료 — CirclePhase 18개 + 비밀창고 ${ERANGEL_STASHES.length + TAEGO_STASHES.length}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
