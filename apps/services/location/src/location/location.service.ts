// 자기장 원 내 프로 위치 필터링 + 거리순 정렬 서비스
import { Injectable, Inject } from '@nestjs/common';
import { LocationTier } from '@prisma/client';
import type { CircleData, LocationData, MapType } from '@pubg-helper/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { RecommendLocationsDto } from './dto/recommend-locations.dto';

const MAX_RESULTS = 20;

@Injectable()
export class LocationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll(mapType: MapType): Promise<LocationData[]> {
    const map = await this.prisma.map.findUnique({ where: { type: mapType } });
    if (!map) return [];

    const locations = await this.prisma.location.findMany({ where: { mapId: map.id } });
    return locations.map((loc) => ({ ...loc, tier: loc.tier as LocationTier, mapType }));
  }

  async recommend(dto: RecommendLocationsDto): Promise<LocationData[]> {
    const { circle, mapType } = dto;

    const map = await this.prisma.map.findUnique({ where: { type: mapType } });
    if (!map) return [];

    const locations = await this.prisma.location.findMany({
      where: { mapId: map.id },
    });

    return locations
      .filter((loc) => this.isInsideCircle(loc.coordX, loc.coordY, circle))
      .map((loc) => ({
        ...loc,
        tier: loc.tier as LocationTier,
        mapType,
        distance: this.calcDistance(loc.coordX, loc.coordY, circle),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, MAX_RESULTS)
      .map(({ distance: _d, ...loc }) => loc as LocationData);
  }

  private isInsideCircle(x: number, y: number, circle: CircleData): boolean {
    const dist = this.calcDistance(x, y, circle);
    return dist <= circle.r;
  }

  private calcDistance(x: number, y: number, circle: CircleData): number {
    return Math.sqrt(Math.pow(x - circle.x, 2) + Math.pow(y - circle.y, 2));
  }
}
