// alert-service 루트 모듈
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AlertModule } from './alert/alert.module';

@Module({
  imports: [AlertModule],
  controllers: [AppController],
})
export class AppModule {}
