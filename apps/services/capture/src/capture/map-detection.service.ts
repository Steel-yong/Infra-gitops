// 캡처 프레임 전체 영역의 PUBG 바다색(청록) 비율로 전체맵 열림 여부를 감지하는 서비스
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class MapDetectionService {
  async isMapOpen(base64: string): Promise<boolean> {
    const buffer = Buffer.from(base64, 'base64');
    const image = sharp(buffer);
    const { width = 0, height = 0 } = await image.metadata();

    // 외곽 UI/게임화면 5% 제거 후 전체 스캔
    const borderX = Math.floor(width * 0.05);
    const borderY = Math.floor(height * 0.05);
    const cropW = width - borderX * 2;
    const cropH = height - borderY * 2;

    const { data } = await image
      .extract({ left: borderX, top: borderY, width: cropW, height: cropH })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let tealCount = 0;
    let sampleCount = 0;

    // 4픽셀 간격 샘플링으로 성능 유지
    for (let y = 0; y < cropH; y += 4) {
      for (let x = 0; x < cropW; x += 4) {
        const i = (y * cropW + x) * 3;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // PUBG 전체맵 바다 특유의 어두운 청록색: B가 R보다 12+ 높고, G 이상, 적당한 어두운 범위
        if (b > r + 12 && b > g && b >= 38 && r < 115 && g < 115) {
          tealCount++;
        }
        sampleCount++;
      }
    }

    // 3% 이상이면 전체맵 열림으로 판단
    return tealCount / sampleCount > 0.03;
  }
}
