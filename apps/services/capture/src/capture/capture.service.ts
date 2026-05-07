// 프레임 이미지를 분석해 자기장 원 데이터를 반환하는 서비스 (U9에서 실제 감지 구현)
import { Injectable } from '@nestjs/common';
import type { CircleData } from '@pubg-helper/shared';

@Injectable()
export class CaptureService {
  async processFrame(_base64: string): Promise<CircleData | null> {
    // U9: 전체맵 열림 감지 + Hough Circle Transform 구현 예정
    return null;
  }
}
