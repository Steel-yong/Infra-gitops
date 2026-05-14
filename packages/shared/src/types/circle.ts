// 자기장 원 중심 좌표와 반경 타입 (0~1 정규화 좌표)

export interface CircleData {
  /** 자기장 원 중심 X 좌표 (0~1 정규화) */
  x: number;
  /** 자기장 원 중심 Y 좌표 (0~1 정규화) */
  y: number;
  /** 자기장 원 반경 (0~1 정규화) */
  r: number;
  /** 검출된 반경에서 추정한 PUBG 페이즈 번호 (1~8). 검출 정확도 디버깅용. */
  phase?: number;
}
