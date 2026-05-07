// 캡처 프레임 중앙 파란색 픽셀 비율로 전체맵 열림 여부를 감지하는 서비스
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class MapDetectionService {
  async isMapOpen(base64: string): Promise<boolean> {
    const buffer = Buffer.from(base64, 'base64');
    const image = sharp(buffer);
    const { width = 0, height = 0 } = await image.metadata();

    const cropW = Math.floor(width * 0.3);
    const cropH = Math.floor(height * 0.3);
    const left = Math.floor((width - cropW) / 2);
    const top = Math.floor((height - cropH) / 2);

    const { data } = await image
      .extract({ left, top, width: cropW, height: cropH })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let blueCount = 0;
    const total = cropW * cropH;

    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (b > 150 && b > r * 1.5 && b > g * 1.5) {
        blueCount++;
      }
    }

    return blueCount / total > 0.3;
  }
}
