// 에란겔 27도시 좌표 — 사용자 시각 검증 (2026-05-22 보정)
// 단위: PUBG 작은 격자 = 100m = 0.0125 (1/80). 5/22 사용자 검증으로 8도시 보정.
// 자율 분석 BEST/SECONDARY 좌표는 OCR transform fallback으로 부정확해 전량 제거함.
// 영상 기반 명당 도출은 도시명 anchor 기반 재분석 후 별도 시드로 추가 예정.
export interface CityCoord { name: string; gx: number; gy: number; cell: string; }

export const ERANGEL_CITIES: CityCoord[] = [
  { name: "Boatyard", gx: 0.4275, gy: 0.393, cell: "DL" },     // 5/22: 위2 왼1
  { name: "Farm", gx: 0.656, gy: 0.558, cell: "FM" },
  { name: "Ferry", gx: 0.341, gy: 0.6965, cell: "CN" },        // 5/22: 위1
  { name: "Gatka", gx: 0.269, gy: 0.478, cell: "CL" },
  { name: "Georgopol", gx: 0.226, gy: 0.314, cell: "BK" },
  { name: "Hospital", gx: 0.188, gy: 0.397, cell: "BL" },
  { name: "Kameshki", gx: 0.82, gy: 0.137, cell: "GJ" },
  { name: "Lipovka", gx: 0.866, gy: 0.402, cell: "GL" },
  { name: "Mansion", gx: 0.767, gy: 0.381, cell: "GL" },
  { name: "MilBase", gx: 0.552, gy: 0.804, cell: "EO" },
  { name: "Mylta", gx: 0.731, gy: 0.578, cell: "FM" },
  { name: "MyltaPower", gx: 0.895, gy: 0.543, cell: "HM" },    // 5/22: 위2
  { name: "Novorepnoye", gx: 0.744, gy: 0.741, cell: "FN" },
  { name: "Pochinki", gx: 0.446, gy: 0.493, cell: "DL" },
  { name: "Primorsk", gx: 0.206, gy: 0.74, cell: "BN" },
  { name: "Prison", gx: 0.768, gy: 0.4635, cell: "GL" },       // 5/22: 위1
  { name: "Quarry", gx: 0.2, gy: 0.655, cell: "BN" },          // 5/22: 위2
  { name: "Rozhok", gx: 0.493, gy: 0.351, cell: "DK" },
  { name: "Ruins", gx: 0.389, gy: 0.412, cell: "DL" },
  { name: "School", gx: 0.52, gy: 0.405, cell: "EL" },         // 5/22: 위2
  { name: "Severny", gx: 0.468, gy: 0.148, cell: "DJ" },
  { name: "Shelter", gx: 0.699, gy: 0.483, cell: "FL" },
  { name: "Shooting", gx: 0.418, gy: 0.2115, cell: "DJ" },     // 5/22: 위1
  { name: "SosnovkaIsl", gx: 0.554, gy: 0.735, cell: "EN" },
  { name: "Stalber", gx: 0.701, gy: 0.155, cell: "FJ" },
  { name: "Yasnaya", gx: 0.6725, gy: 0.292, cell: "FK" },      // 5/22: 왼1
  { name: "Zharki", gx: 0.134, gy: 0.156, cell: "BJ" },
];
