// 앱 공통 엔드포인트 컨트롤러 (헬스체크 + DB 상태)
import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('health')
  async health(): Promise<{ status: string; db: string }> {
    const healthy = await this.prisma.isHealthy();
    if (!healthy) {
      throw new HttpException(
        { status: 'error', db: 'disconnected' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { status: 'ok', db: 'connected' };
  }
}
