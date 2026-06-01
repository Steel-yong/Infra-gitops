// 프로 telemetry 샘플열에서 자기장 안 정지(holding) 위치를 페이즈별로 추출하는 순수 모듈
//
// PoC `.local/extract-pro-holdings.py`를 TS 순수 함수로 제품화한 것.
// 입력은 이미 파싱된 도메인 구조(PlayerSample/ZoneSnapshot/LandingEvent)이고,
// telemetry raw JSON → 이 구조로의 변환(I/O 경계)은 별도 파서가 담당한다.

/** 한 선수의 한 시점 위치 표본. x,y는 게임 절대 좌표(cm). */
export interface PlayerSample {
  name: string;
  teamId: number;
  /** 경기 시작 후 경과 초. */
  t: number;
  /** 절대 X (cm, 0=좌상단, →동). */
  x: number;
  /** 절대 Y (cm, 0=좌상단, →남). */
  y: number;
  /** 차량 탑승 중. */
  inVehicle: boolean;
  /** 자기장(블루존) 밖. */
  inBlueZone: boolean;
}

/** 안전지대 반경 스냅샷. */
export interface ZoneSnapshot {
  t: number;
  /** 안전지대 반경(정규화, 0~1 = cm/맵변). */
  radiusNorm: number;
}

/** 착지 이벤트(선수별 착지 시각). */
export interface LandingEvent {
  name: string;
  t: number;
}

/** 추출된 명당(자기장 안 정지 위치). */
export interface Holding {
  name: string;
  teamId: number;
  /** 정규화 X (0~1). */
  x: number;
  /** 정규화 Y (0~1). */
  y: number;
  /** 페이즈(1~5). */
  phase: number;
  /** 정지 지속 초. */
  durSec: number;
  /** 정지 런을 이룬 표본 수. */
  sampleCount: number;
}

/** 추출 옵션. */
export interface ExtractOptions {
  /** 맵 한 변(cm). 8x8맵=816000, 사녹=408000. */
  side: number;
  /** 정지 판정 이동 임계(cm). 이 값 미만 이동이면 정지로 본다. */
  thresholdCm: number;
  /** 명당으로 인정할 최대 페이즈. 기본 5(P6+ 제외). */
  maxPhase?: number;
}

/** 인접 표본을 같은 정지 런으로 묶을 최대 시간 간격(초). 위치 주기 ~10초 + 여유. */
const STOP_GAP_SEC = 15;

/** 정지 런으로 인정할 최소 연속 표본 수. */
const MIN_RUN = 3;

/** 안전지대 정규화 반경 → 페이즈(임계 내림차순). */
const PHASE_THRESHOLDS: ReadonlyArray<readonly [number, number]> = [
  [0.18, 1], [0.1, 2], [0.065, 3], [0.04, 4], [0.026, 5], [0.017, 6], [0.011, 7], [0.007, 8],
];

/**
 * 안전지대 정규화 반경을 페이즈 번호로 변환한다.
 * @param radiusNorm 안전지대 반경(0~1, cm/맵변).
 * @returns 페이즈 1~9.
 */
export function phaseFromRadius(radiusNorm: number): number {
  for (const [thr, phase] of PHASE_THRESHOLDS) {
    if (radiusNorm >= thr) return phase;
  }
  return 9;
}

/**
 * 특정 시각의 페이즈를 안전지대 타임라인에서 찾는다.
 * @param sortedZones t 오름차순 정렬되고 radiusNorm>0 인 스냅샷 목록.
 * @param t 조회 시각(초).
 * @returns 그 시각 이하 마지막 스냅샷의 페이즈. 이전 스냅샷이 없으면 1(콜드 스타트).
 */
export function phaseAt(sortedZones: ZoneSnapshot[], t: number): number {
  let phase = 1;
  for (const z of sortedZones) {
    if (z.t > t) break;
    phase = phaseFromRadius(z.radiusNorm);
  }
  return phase;
}

/** 두 표본 간 평면 거리(cm). */
function distCm(a: PlayerSample, b: PlayerSample): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * telemetry 표본열에서 "자기장 안 + 비차량 + 착지후 + 3샘플 연속 정지" 명당을 페이즈별로 추출한다.
 * @param samples 모든 선수의 위치 표본(필터 전).
 * @param zones 안전지대 타임라인.
 * @param landings 선수별 착지 이벤트.
 * @param opts 맵 변·정지 임계·최대 페이즈.
 * @returns 명당 목록(좌표 정규화 0~1).
 */
export function extractHoldings(
  samples: PlayerSample[],
  zones: ZoneSnapshot[],
  landings: LandingEvent[],
  opts: ExtractOptions,
): Holding[] {
  const { side, thresholdCm } = opts;
  const maxPhase = opts.maxPhase ?? 5;

  const landingByName = new Map<string, number>();
  for (const l of landings) landingByName.set(l.name, l.t);

  const sortedZones = zones.filter((z) => z.radiusNorm > 0).sort((a, b) => a.t - b.t);

  // 자격 표본 수집: 비차량 + 자기장 안 + 착지 후.
  const byPlayer = new Map<string, PlayerSample[]>();
  for (const s of samples) {
    if (s.inVehicle || s.inBlueZone) continue;
    const landed = landingByName.get(s.name);
    if (landed !== undefined && s.t < landed) continue;
    const arr = byPlayer.get(s.name);
    if (arr) arr.push(s);
    else byPlayer.set(s.name, [s]);
  }

  const holds: Holding[] = [];
  for (const arr of byPlayer.values()) {
    arr.sort((a, b) => a.t - b.t);
    const n = arr.length;
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && arr[j + 1].t - arr[j].t <= STOP_GAP_SEC && distCm(arr[j], arr[j + 1]) < thresholdCm) {
        j++;
      }
      const run = arr.slice(i, j + 1);
      if (run.length >= MIN_RUN) {
        const mid = (run[0].t + run[run.length - 1].t) / 2;
        const phase = phaseAt(sortedZones, mid);
        if (phase <= maxPhase) {
          const cx = run.reduce((acc, r) => acc + r.x, 0) / run.length;
          const cy = run.reduce((acc, r) => acc + r.y, 0) / run.length;
          holds.push({
            name: run[0].name,
            teamId: run[0].teamId,
            x: cx / side,
            y: cy / side,
            phase,
            durSec: run[run.length - 1].t - run[0].t,
            sampleCount: run.length,
          });
        }
      }
      i = j > i ? j + 1 : i + 1;
    }
  }
  return holds;
}
