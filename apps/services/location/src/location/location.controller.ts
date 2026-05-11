// 프로 추천 위치 REST 컨트롤러 — POST /locations/recommend
import { Body, Controller, Inject, Post } from '@nestjs/common';
import type { LocationData } from '@pubg-helper/shared';
import { LocationService } from './location.service';
import { RecommendLocationsDto } from './dto/recommend-locations.dto';

@Controller('locations')
export class LocationController {
  constructor(@Inject(LocationService) private readonly locationService: LocationService) {}

  @Post('recommend')
  async recommend(@Body() dto: RecommendLocationsDto): Promise<LocationData[]> {
    return this.locationService.recommend(dto);
  }
}
