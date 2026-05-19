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

  // ── 에란겔 명당 — PUB-35 영상 분석 자동 도출 (가중 점수 알고리즘) ──
  // 데이터: PUBG Esports KR 채널 PWS/PGS/PGC/QUALIFIERS/마스터즈 (MAP) 영상 23개
  // 마커 10,462개 → DBSCAN(eps=0.015) + 가중 점수 = log(매치+1) × sqrt(마커수)
  // 신뢰도: 매치 ≥3 공통 필터 (80곳 모두 S tier)
  type Tier = 'S' | 'A' | 'B';
  const ERANGEL_PRO: { id: string; coordX: number; coordY: number; tier: Tier; teams: string[] }[] = [
    { id: 'er-pws-001', coordX: 0.5354, coordY: 0.7266, tier: 'S', teams: ['프로팀 19매치 공통'] },  // 능선·고지 (186마커)
    { id: 'er-pws-002', coordX: 0.6651, coordY: 0.7308, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 능선·고지 (159마커)
    { id: 'er-pws-003', coordX: 0.6106, coordY: 0.6987, tier: 'S', teams: ['프로팀 18매치 공통'] },  // 능선·고지 (113마커)
    { id: 'er-pws-004', coordX: 0.5656, coordY: 0.1520, tier: 'S', teams: ['프로팀 21매치 공통'] },  // 야스나야 권역 (83마커)
    { id: 'er-pws-005', coordX: 0.4930, coordY: 0.5198, tier: 'S', teams: ['프로팀 16매치 공통'] },  // 포친키 중심 (87마커)
    { id: 'er-pws-006', coordX: 0.4919, coordY: 0.2499, tier: 'S', teams: ['프로팀 17매치 공통'] },  // 중부 (76마커)
    { id: 'er-pws-007', coordX: 0.4315, coordY: 0.7889, tier: 'S', teams: ['프로팀 14매치 공통'] },  // 소스노프카 군사기지 (70마커)
    { id: 'er-pws-008', coordX: 0.7807, coordY: 0.5917, tier: 'S', teams: ['프로팀 12매치 공통'] },  // 밀타 (66마커)
    { id: 'er-pws-009', coordX: 0.5802, coordY: 0.5538, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 동남 능선 (56마커)
    { id: 'er-pws-010', coordX: 0.5264, coordY: 0.3837, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 중북부 (54마커)
    { id: 'er-pws-011', coordX: 0.8032, coordY: 0.5077, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 밀타 (49마커)
    { id: 'er-pws-012', coordX: 0.4693, coordY: 0.9215, tier: 'S', teams: ['프로팀 9매치 공통'] },  // 군사기지 남쪽 (56마커)
    { id: 'er-pws-013', coordX: 0.6253, coordY: 0.5883, tier: 'S', teams: ['프로팀 14매치 공통'] },  // 동남 능선 (39마커)
    { id: 'er-pws-014', coordX: 0.5894, coordY: 0.4794, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 학교/로족 권역 (45마커)
    { id: 'er-pws-015', coordX: 0.6111, coordY: 0.1545, tier: 'S', teams: ['프로팀 10매치 공통'] },  // 야스나야 (48마커)
    { id: 'er-pws-016', coordX: 0.4893, coordY: 0.5975, tier: 'S', teams: ['프로팀 10매치 공통'] },  // 포친키 (47마커)
    { id: 'er-pws-017', coordX: 0.4663, coordY: 0.3687, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 중부 (43마커)
    { id: 'er-pws-018', coordX: 0.3865, coordY: 0.7322, tier: 'S', teams: ['프로팀 8매치 공통'] },  // 남서부 (54마커)
    { id: 'er-pws-019', coordX: 0.7001, coordY: 0.2268, tier: 'S', teams: ['프로팀 7매치 공통'] },  // 야스나야 동 (53마커)
    { id: 'er-pws-020', coordX: 0.3243, coordY: 0.5353, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 서부 (37마커)
    { id: 'er-pws-021', coordX: 0.4967, coordY: 0.8476, tier: 'S', teams: ['프로팀 8매치 공통'] },  // 소스노프카 군사기지 (45마커)
    { id: 'er-pws-022', coordX: 0.8404, coordY: 0.4159, tier: 'S', teams: ['프로팀 8매치 공통'] },  // 동부 (44마커)
    { id: 'er-pws-023', coordX: 0.4428, coordY: 0.4534, tier: 'S', teams: ['프로팀 10매치 공통'] },  // 포친키 (35마커)
    { id: 'er-pws-024', coordX: 0.6219, coordY: 0.2212, tier: 'S', teams: ['프로팀 11매치 공통'] },  // 야스나야 (32마커)
    { id: 'er-pws-025', coordX: 0.3856, coordY: 0.6000, tier: 'S', teams: ['프로팀 7매치 공통'] },  // 포친키 서 (40마커)
    { id: 'er-pws-026', coordX: 0.4266, coordY: 0.2557, tier: 'S', teams: ['프로팀 7매치 공통'] },  // 중북부 (31마커)
    { id: 'er-pws-027', coordX: 0.6622, coordY: 0.3664, tier: 'S', teams: ['프로팀 6매치 공통'] },  // 동부 (33마커)
    { id: 'er-pws-028', coordX: 0.6958, coordY: 0.5043, tier: 'S', teams: ['프로팀 8매치 공통'] },  // 학교/로족 (25마커)
    { id: 'er-pws-029', coordX: 0.5105, coordY: 0.6950, tier: 'S', teams: ['프로팀 8매치 공통'] },  // 중남부 (25마커)
    { id: 'er-pws-030', coordX: 0.4006, coordY: 0.6352, tier: 'S', teams: ['프로팀 9매치 공통'] },  // 포친키 서 (22마커)
    { id: 'er-pws-031', coordX: 0.7158, coordY: 0.8938, tier: 'S', teams: ['프로팀 6매치 공통'] },  // 동남 끝 (29마커)
    { id: 'er-pws-032', coordX: 0.7195, coordY: 0.6561, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 동남 능선 (32마커)
    { id: 'er-pws-033', coordX: 0.4812, coordY: 0.7537, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 소스노프카 (26마커)
    { id: 'er-pws-034', coordX: 0.5699, coordY: 0.6055, tier: 'S', teams: ['프로팀 7매치 공통'] },  // 동남 능선 (19마커)
    { id: 'er-pws-035', coordX: 0.5768, coordY: 0.3727, tier: 'S', teams: ['프로팀 9매치 공통'] },  // 중부 (15마커)
    { id: 'er-pws-036', coordX: 0.8349, coordY: 0.7270, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 밀타 (36마커)
    { id: 'er-pws-037', coordX: 0.5990, coordY: 0.9860, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 남부 끝 (36마커)
    { id: 'er-pws-038', coordX: 0.8428, coordY: 0.2136, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 야스나야 동 (26마커)
    { id: 'er-pws-039', coordX: 0.8654, coordY: 0.0854, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 동북 (34마커)
    { id: 'er-pws-040', coordX: 0.4405, coordY: 0.2110, tier: 'S', teams: ['프로팀 7매치 공통'] },  // 중북부 (14마커)
    { id: 'er-pws-041', coordX: 0.3860, coordY: 0.2807, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 서북부 (18마커)
    { id: 'er-pws-042', coordX: 0.5574, coordY: 0.8164, tier: 'S', teams: ['프로팀 6매치 공통'] },  // 소스노프카 (15마커)
    { id: 'er-pws-043', coordX: 0.5281, coordY: 0.4757, tier: 'S', teams: ['프로팀 8매치 공통'] },  // 포친키 (11마커)
    { id: 'er-pws-044', coordX: 0.4617, coordY: 0.1702, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 중북부 (16마커)
    { id: 'er-pws-045', coordX: 0.5161, coordY: 0.5102, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 포친키 (16마커)
    { id: 'er-pws-046', coordX: 0.7714, coordY: 0.5102, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 학교/로족 (26마커)
    { id: 'er-pws-047', coordX: 0.3521, coordY: 0.7575, tier: 'S', teams: ['프로팀 6매치 공통'] },  // 남서부 (13마커)
    { id: 'er-pws-048', coordX: 0.4436, coordY: 0.5588, tier: 'S', teams: ['프로팀 6매치 공통'] },  // 포친키 서 (13마커)
    { id: 'er-pws-049', coordX: 0.6939, coordY: 0.5989, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 동남 능선 (15마커)
    { id: 'er-pws-050', coordX: 0.6443, coordY: 0.5455, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 학교/로족 (25마커)
    { id: 'er-pws-051', coordX: 0.5990, coordY: 0.3439, tier: 'S', teams: ['프로팀 6매치 공통'] },  // 중부 (12마커)
    { id: 'er-pws-052', coordX: 0.7634, coordY: 0.2051, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 야스나야 (23마커)
    { id: 'er-pws-053', coordX: 0.7269, coordY: 0.8501, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 남동부 (17마커)
    { id: 'er-pws-054', coordX: 0.4253, coordY: 0.4096, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 중부 (16마커)
    { id: 'er-pws-055', coordX: 0.8209, coordY: 0.6839, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 밀타 (16마커)
    { id: 'er-pws-056', coordX: 0.7385, coordY: 0.3403, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 동부 (15마커)
    { id: 'er-pws-057', coordX: 0.6434, coordY: 0.8706, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 군사기지 동 (15마커)
    { id: 'er-pws-058', coordX: 0.9059, coordY: 0.8388, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 동남 끝 (20마커)
    { id: 'er-pws-059', coordX: 0.6050, coordY: 0.8371, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 소스노프카 (19마커)
    { id: 'er-pws-060', coordX: 0.4462, coordY: 0.7159, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 중남부 (11마커)
    { id: 'er-pws-061', coordX: 0.8129, coordY: 0.6367, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 밀타 (11마커)
    { id: 'er-pws-062', coordX: 0.7537, coordY: 0.1497, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 야스나야 (13마커)
    { id: 'er-pws-063', coordX: 0.5508, coordY: 0.4431, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 학교/로족 (10마커)
    { id: 'er-pws-064', coordX: 0.4182, coordY: 0.4947, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 포친키 서 (10마커)
    { id: 'er-pws-065', coordX: 0.6920, coordY: 0.1614, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 야스나야 동 (12마커)
    { id: 'er-pws-066', coordX: 0.5851, coordY: 0.2461, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 중부 (9마커)
    { id: 'er-pws-067', coordX: 0.5450, coordY: 0.9331, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 군사기지 남 (15마커)
    { id: 'er-pws-068', coordX: 0.7212, coordY: 0.7758, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 동남 (14마커)
    { id: 'er-pws-069', coordX: 0.7750, coordY: 0.3107, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 동북 (14마커)
    { id: 'er-pws-070', coordX: 0.3917, coordY: 0.5572, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 포친키 서 (10마커)
    { id: 'er-pws-071', coordX: 0.8067, coordY: 0.2979, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 동부 (10마커)
    { id: 'er-pws-072', coordX: 0.4047, coordY: 0.5342, tier: 'S', teams: ['프로팀 5매치 공통'] },  // 포친키 서 (8마커)
    { id: 'er-pws-073', coordX: 0.9007, coordY: 0.5584, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 동부 끝 (13마커)
    { id: 'er-pws-074', coordX: 0.6432, coordY: 0.7946, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 소스노프카 동 (13마커)
    { id: 'er-pws-075', coordX: 0.7774, coordY: 0.6653, tier: 'S', teams: ['프로팀 4매치 공통'] },  // 밀타 (9마커)
    { id: 'er-pws-076', coordX: 0.6867, coordY: 0.6853, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 동남 능선 (12마커)
    { id: 'er-pws-077', coordX: 0.5853, coordY: 0.9108, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 군사기지 남 (12마커)
    { id: 'er-pws-078', coordX: 0.5441, coordY: 0.8964, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 군사기지 남 (12마커)
    { id: 'er-pws-079', coordX: 0.3668, coordY: 0.6170, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 포친키 서 (11마커)
    { id: 'er-pws-080', coordX: 0.3072, coordY: 0.7201, tier: 'S', teams: ['프로팀 3매치 공통'] },  // 남서부 (10마커)
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
