// capture-service 루트 모듈
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CaptureModule } from './capture/capture.module';

@Module({
  imports: [CaptureModule],
  controllers: [AppController],
})
export class AppModule {}
