// 앱 공통 엔드포인트 컨트롤러 (헬스체크)
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
