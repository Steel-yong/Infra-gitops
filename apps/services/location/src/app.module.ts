// location-service 루트 모듈
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { LocationModule } from './location/location.module';

@Module({
  imports: [PrismaModule, LocationModule],
  controllers: [AppController],
})
export class AppModule {}
