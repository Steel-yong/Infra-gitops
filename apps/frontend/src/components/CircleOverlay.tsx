'use client';
// WebSocket에서 수신한 CircleData를 자기장 원으로 오버레이하는 컴포넌트
// 원 안쪽은 맵 노출, 바깥쪽은 파란 위험 구역, 테두리는 흰 링

import { SVGOverlay } from 'react-leaflet';
import type { CircleData } from '@pubg-helper/shared';

/** MapCanvas와 동일한 전체 맵 경계 */
const BOUNDS: [[number, number], [number, number]] = [
  [0, 0],
  [1, 1],
];

interface CircleOverlayProps {
  circleData: CircleData | null;
}

/**
 * SVG evenodd fill-rule로 원 바깥 영역을 파랗게 채운다.
 * 좌표계: SVGOverlay viewBox "0 0 1 1" 기준
 *   - SVG x = circleData.x (이미지 좌→우 0→1)
 *   - SVG y = circleData.y (이미지 위→아래 0→1, SVG와 동일 방향)
 */
export function CircleOverlay({ circleData }: CircleOverlayProps) {
  if (!circleData) return null;

  const { x, y, r } = circleData;

  // evenodd: 외부 rect에 원 구멍을 뚫어 바깥 영역만 채움
  const outerRect = `M 0 0 L 1 0 L 1 1 L 0 1 Z`;
  const circleHole = `M ${x} ${y} m ${-r} 0 a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;

  return (
    <SVGOverlay
      bounds={BOUNDS}
      attributes={{ viewBox: '0 0 1 1', preserveAspectRatio: 'none' }}
    >
      {/* 자기장 바깥 파란 위험 구역 */}
      <path
        d={`${outerRect} ${circleHole}`}
        fill="rgba(30, 100, 255, 0.35)"
        fillRule="evenodd"
        stroke="none"
      />
      {/* 자기장 경계 흰 링 */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="white"
        strokeWidth="0.006"
        strokeOpacity={0.95}
      />
    </SVGOverlay>
  );
}
