// 프로 위치 추천 API 요청 DTO — 자기장 원 + 맵 타입 입력 검증
import { IsEnum, IsNumber, IsObject, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { CircleData, MapType } from '@pubg-helper/shared';

class CircleDataDto implements CircleData {
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  r!: number;
}

export class RecommendLocationsDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CircleDataDto)
  circle!: CircleData;

  @IsEnum(['erangel', 'taego'])
  mapType!: MapType;
}
