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

  // 프로 명당 위치 데이터 — 에란겔 v1 (PUB-33)
  type Tier = 'S' | 'A' | 'B';
  // 에란겔 명당 자리 (PUB-33 v1 — mockup 46곳 + 4 Agent 출처 통합)
  // 좌표는 PUBG 8×8 격자 셀 중심값 (±0.05) — 정밀화는 v1.5에서
  // tier: S=최종권 빈출, A=중반 유효, B=초중반·핫드롭
  const ERANGEL_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [
    { id: 'er-big-hill-se-of-georgopol', coordX: 0.3100, coordY: 0.4400, tier: 'S', teams: ['조르조폴 남쪽 큰 언덕'] },
    { id: 'er-hill-east-of-pochinki', coordX: 0.6300, coordY: 0.5600, tier: 'S', teams: ['포친키 동쪽 언덕'] },
    { id: 'er-mil-base-radio-tower-hill', coordX: 0.5600, coordY: 0.7500, tier: 'S', teams: ['군사기지 라디오 타워 언덕'] },
    { id: 'er-pochinki-center', coordX: 0.4400, coordY: 0.5300, tier: 'S', teams: ['포친키 중심'] },
    { id: 'er-pochinki-church-hill', coordX: 0.4400, coordY: 0.5600, tier: 'S', teams: ['포친키 교회 언덕'] },
    { id: 'er-pochinki-east-rocky-hill', coordX: 0.5600, coordY: 0.5600, tier: 'S', teams: ['포친키 오른쪽 돌산'] },
    { id: 'er-rozhok-south-warehouse-ridge', coordX: 0.4400, coordY: 0.3800, tier: 'S', teams: ['로족 남쪽 창고능선'] },
    { id: 'er-school', coordX: 0.5600, coordY: 0.4400, tier: 'S', teams: ['학교'] },
    { id: 'er-sosnovka-military-base', coordX: 0.5000, coordY: 0.8100, tier: 'S', teams: ['소스노브카 군사기지'] },
    { id: 'er-yasnaya-chimney-gap', coordX: 0.6900, coordY: 0.1900, tier: 'S', teams: ['야스나야 굴뚝 갭'] },
    { id: 'er-yasnaya-polyana', coordX: 0.7500, coordY: 0.1900, tier: 'S', teams: ['야스나야 폴랴나'] },
    { id: 'er-ant-hell-house-interior', coordX: 0.3120, coordY: 0.5570, tier: 'A', teams: ['개미지옥 건물 내부'] },
    { id: 'er-georgopol-north-apts', coordX: 0.1900, coordY: 0.1900, tier: 'A', teams: ['조르조폴 북부 아파트'] },
    { id: 'er-hospital', coordX: 0.3120, coordY: 0.3120, tier: 'A', teams: ['병원'] },
    { id: 'er-hospital-rooftop', coordX: 0.3100, coordY: 0.3100, tier: 'A', teams: ['병원 옥상'] },
    { id: 'er-mil-base-sw-hill', coordX: 0.4400, coordY: 0.8100, tier: 'A', teams: ['군사기지 남서 언덕'] },
    { id: 'er-mylta-power', coordX: 0.8100, coordY: 0.5600, tier: 'A', teams: ['밀타 파워'] },
    { id: 'er-mylta-power-rooftop', coordX: 0.8100, coordY: 0.5800, tier: 'A', teams: ['밀타 파워 옥상'] },
    { id: 'er-north-river-chain-ridge', coordX: 0.3800, coordY: 0.1900, tier: 'A', teams: ['강북 연속능선'] },
    { id: 'er-novo-north-highland', coordX: 0.8120, coordY: 0.6880, tier: 'A', teams: ['노보 북쪽 산악지대'] },
    { id: 'er-novorepnoye', coordX: 0.6900, coordY: 0.9400, tier: 'A', teams: ['노보레프노예'] },
    { id: 'er-novorepnoye-radio-tower', coordX: 0.6900, coordY: 0.8100, tier: 'A', teams: ['노보레프노예 라디오타워'] },
    { id: 'er-pochinki-se-large-house-stairs', coordX: 0.5720, coordY: 0.5670, tier: 'A', teams: ['포친키 동남쪽 큰집 계단'] },
    { id: 'er-pochinki-se-warehouse', coordX: 0.5600, coordY: 0.6000, tier: 'A', teams: ['포친키 SE 창고'] },
    { id: 'er-prison-guard-peak', coordX: 0.3100, coordY: 0.8100, tier: 'A', teams: ['감옥 Guard Peak'] },
    { id: 'er-quarry', coordX: 0.3120, coordY: 0.5620, tier: 'A', teams: ['채석장'] },
    { id: 'er-quarry-east-hilltop', coordX: 0.4380, coordY: 0.5620, tier: 'A', teams: ['채석장 동쪽 언덕'] },
    { id: 'er-quarry-north-ridge', coordX: 0.3100, coordY: 0.4450, tier: 'A', teams: ['개미지옥 북쪽 능선'] },
    { id: 'er-quarry-west-secret-cache', coordX: 0.3120, coordY: 0.5670, tier: 'A', teams: ['쿼리 서쪽 비밀 지하창고'] },
    { id: 'er-red-roof-shack-compound', coordX: 0.4400, coordY: 0.4400, tier: 'A', teams: ['짱구집'] },
    { id: 'er-rozhok-east-ridge', coordX: 0.5600, coordY: 0.3800, tier: 'A', teams: ['로족 동쪽 능선'] },
    { id: 'er-rozhok-hill', coordX: 0.5600, coordY: 0.4450, tier: 'A', teams: ['로족 언덕'] },
    { id: 'er-ruins-south-shack-ridge', coordX: 0.4100, coordY: 0.3400, tier: 'A', teams: ['루인스 남쪽 판자집 능선'] },
    { id: 'er-severny', coordX: 0.5600, coordY: 0.0600, tier: 'A', teams: ['세브나이'] },
    { id: 'er-shelter', coordX: 0.6900, coordY: 0.5000, tier: 'A', teams: ['셸터'] },
    { id: 'er-shooting-range', coordX: 0.4380, coordY: 0.1880, tier: 'A', teams: ['사격장'] },
    { id: 'er-shooting-range-bunker', coordX: 0.3100, coordY: 0.1900, tier: 'A', teams: ['슈팅 레인지 벙커'] },
    { id: 'er-stalber-peak', coordX: 0.8100, coordY: 0.0600, tier: 'A', teams: ['스탈버 산 정상'] },
    { id: 'er-yasnaya-south-villas', coordX: 0.8100, coordY: 0.2500, tier: 'A', teams: ['야스나야 남쪽 빌라'] },
    { id: 'er-yasnaya-west-shacks', coordX: 0.6900, coordY: 0.2200, tier: 'A', teams: ['야스나야 따개비'] },
    { id: 'er-checkpoint', coordX: 0.6880, coordY: 0.4380, tier: 'B', teams: ['검문소'] },
    { id: 'er-east-erangel-container-yard', coordX: 0.8220, coordY: 0.8120, tier: 'B', teams: ['에란겔 동쪽 컨테이너'] },
    { id: 'er-farm', coordX: 0.5620, coordY: 0.5620, tier: 'B', teams: ['농장'] },
    { id: 'er-farm-ridge', coordX: 0.3120, coordY: 0.1880, tier: 'B', teams: ['농장 능선'] },
    { id: 'er-ferry-pier', coordX: 0.3100, coordY: 0.7200, tier: 'B', teams: ['페리 피어'] },
    { id: 'er-gatka', coordX: 0.4400, coordY: 0.6900, tier: 'B', teams: ['가트카'] },
    { id: 'er-georgopol-containers', coordX: 0.1900, coordY: 0.3100, tier: 'B', teams: ['조르조폴 컨테이너'] },
    { id: 'er-kameshki', coordX: 0.8800, coordY: 0.0600, tier: 'B', teams: ['카메시키'] },
    { id: 'er-lipovka', coordX: 0.8100, coordY: 0.4400, tier: 'B', teams: ['리포브카'] },
    { id: 'er-mansion', coordX: 0.6880, coordY: 0.1880, tier: 'B', teams: ['맨션'] },
    { id: 'er-mansion-north', coordX: 0.8100, coordY: 0.1300, tier: 'B', teams: ['맨션 북부'] },
    { id: 'er-mylta-power-front-warehouse', coordX: 0.8120, coordY: 0.5570, tier: 'B', teams: ['밀타파워 앞쪽 창고'] },
    { id: 'er-mylta-town', coordX: 0.7500, coordY: 0.5800, tier: 'B', teams: ['밀타 마을'] },
    { id: 'er-primorsk', coordX: 0.0620, coordY: 0.6880, tier: 'B', teams: ['프리모르스크'] },
    { id: 'er-primorsk-docks', coordX: 0.1300, coordY: 0.7500, tier: 'B', teams: ['프리모르스크 독'] },
    { id: 'er-primorsk-north-hill', coordX: 0.1900, coordY: 0.6300, tier: 'B', teams: ['프리모르스크 북쪽 언덕'] },
    { id: 'er-prison', coordX: 0.3100, coordY: 0.7500, tier: 'B', teams: ['감옥'] },
    { id: 'er-rozhok-city', coordX: 0.5620, coordY: 0.4330, tier: 'B', teams: ['로조크 시가지'] },
    { id: 'er-rozhok-nw-fringe', coordX: 0.4380, coordY: 0.3220, tier: 'B', teams: ['로족 북서쪽 외곽'] },
    { id: 'er-ruins', coordX: 0.4400, coordY: 0.4000, tier: 'B', teams: ['폐허'] },
    { id: 'er-school-north-apartments', coordX: 0.4400, coordY: 0.2800, tier: 'B', teams: ['학교 북쪽 아파트'] },
    { id: 'er-southern-hay-farms', coordX: 0.5620, coordY: 0.6880, tier: 'B', teams: ['남부 농장지대'] },
    { id: 'er-swamp-watchtower', coordX: 0.1900, coordY: 0.5600, tier: 'B', teams: ['늪지대 망루'] },
    { id: 'er-water-town', coordX: 0.4380, coordY: 0.3120, tier: 'B', teams: ['워터타운'] },
    { id: 'er-western-military-compounds', coordX: 0.1880, coordY: 0.4380, tier: 'B', teams: ['서부 군사 복합지'] },
    { id: 'er-zharki', coordX: 0.1930, coordY: 0.1880, tier: 'B', teams: ['자르키'] },
    { id: 'er-zharki-south-rocky-hill', coordX: 0.1300, coordY: 0.1900, tier: 'B', teams: ['자르키 남쪽 돌산'] },
    { id: 'er-zharki-west-rocky-hill', coordX: 0.0620, coordY: 0.3120, tier: 'B', teams: ['자르키 좌측 돌산'] },
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

  // 기존 명당 데이터 초기화 후 재삽입
  // er-* 명당 (er-pro-XX 옛 더미 + er-school 등 PUB-33 신규) 모두 제거.
  // erangel-stash-XX 비밀창고는 별도 prefix라 영향 없음.
  await prisma.location.deleteMany({
    where: { id: { startsWith: 'er-' } },
  });
  await prisma.location.deleteMany({
    where: { id: { startsWith: 'tg-pro-' } },
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

  console.log(`에란겔 명당 ${ERANGEL_PRO.length}개 완료 (PUB-33 v1)`);
  console.log(`태이고 명당 ${TAEGO_PRO.length}개 완료 (더미 — 후속 PR에서 교체)`);
  console.log(`시드 완료 — CirclePhase 18개 + 비밀창고 ${ERANGEL_STASHES.length + TAEGO_STASHES.length}개 + 명당 ${ERANGEL_PRO.length + TAEGO_PRO.length}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
