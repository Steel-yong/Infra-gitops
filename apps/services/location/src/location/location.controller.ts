// 프로 추천 위치 REST 컨트롤러 — POST /locations/recommend, GET /locations
import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import type { LocationData, MapType } from '@pubg-helper/shared';
import { LocationService } from './location.service';
import { RecommendLocationsDto } from './dto/recommend-locations.dto';

@Controller('locations')
export class LocationController {
  constructor(@Inject(LocationService) private readonly locationService: LocationService) {}

  @Get()
  async findAll(@Query('mapType') mapType: MapType): Promise<LocationData[]> {
    return this.locationService.findAll(mapType);
  }

  @Post('recommend')
  async recommend(@Body() dto: RecommendLocationsDto): Promise<LocationData[]> {
    return this.locationService.recommend(dto);
  }
}
