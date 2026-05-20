// 에란겔 27도시 좌표 — 게임 내 실제 위치 시각 검증 완료 (2026-05-20)
// 자율 분석 BEST/SECONDARY 좌표는 OCR transform fallback으로 부정확해 전량 제거함.
// 영상 기반 명당 도출은 도시명 anchor 기반 재분석 후 별도 시드로 추가 예정.
export interface CityCoord { name: string; gx: number; gy: number; cell: string; }

export const ERANGEL_CITIES: CityCoord[] = [
  { name: "Boatyard", gx: 0.44, gy: 0.418, cell: "DL" },
  { name: "Farm", gx: 0.656, gy: 0.558, cell: "FM" },
  { name: "Ferry", gx: 0.341, gy: 0.709, cell: "CN" },
  { name: "Gatka", gx: 0.269, gy: 0.478, cell: "CL" },
  { name: "Georgopol", gx: 0.226, gy: 0.314, cell: "BK" },
  { name: "Hospital", gx: 0.188, gy: 0.397, cell: "BL" },
  { name: "Kameshki", gx: 0.82, gy: 0.137, cell: "GJ" },
  { name: "Lipovka", gx: 0.866, gy: 0.402, cell: "GL" },
  { name: "Mansion", gx: 0.767, gy: 0.381, cell: "GL" },
  { name: "MilBase", gx: 0.552, gy: 0.804, cell: "EO" },
  { name: "Mylta", gx: 0.731, gy: 0.578, cell: "FM" },
  { name: "MyltaPower", gx: 0.895, gy: 0.568, cell: "HM" },
  { name: "Novorepnoye", gx: 0.744, gy: 0.741, cell: "FN" },
  { name: "Pochinki", gx: 0.446, gy: 0.493, cell: "DL" },
  { name: "Primorsk", gx: 0.206, gy: 0.74, cell: "BN" },
  { name: "Prison", gx: 0.768, gy: 0.476, cell: "GL" },
  { name: "Quarry", gx: 0.2, gy: 0.68, cell: "BN" },
  { name: "Rozhok", gx: 0.493, gy: 0.351, cell: "DK" },
  { name: "Ruins", gx: 0.389, gy: 0.412, cell: "DL" },
  { name: "School", gx: 0.52, gy: 0.43, cell: "EL" },
  { name: "Severny", gx: 0.468, gy: 0.148, cell: "DJ" },
  { name: "Shelter", gx: 0.699, gy: 0.483, cell: "FL" },
  { name: "Shooting", gx: 0.418, gy: 0.224, cell: "DJ" },
  { name: "SosnovkaIsl", gx: 0.554, gy: 0.735, cell: "EN" },
  { name: "Stalber", gx: 0.701, gy: 0.155, cell: "FJ" },
  { name: "Yasnaya", gx: 0.685, gy: 0.292, cell: "FK" },
  { name: "Zharki", gx: 0.134, gy: 0.156, cell: "BJ" },
];
