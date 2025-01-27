import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsObject, IsString } from 'class-validator';
import { AnalyticType, StatisticsDisplayType, TimeRange } from '../../../interfaces/analytics.enum';

export class LayoutConfig {
  @ApiProperty()
  w: number;

  @ApiProperty()
  h: number;

  @ApiProperty()
  x: number;

  @ApiProperty()
  y: number;

  @ApiProperty()
  i: string;
}

export class Layout {
  @ApiProperty({ type: LayoutConfig })
  lg: LayoutConfig;

  @ApiProperty({ type: LayoutConfig })
  md: LayoutConfig;

  @ApiProperty({ type: LayoutConfig })
  sm: LayoutConfig;

  @ApiProperty({ type: LayoutConfig })
  xs: LayoutConfig;
}

export class CreateDashboardCardDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: AnalyticType, isArray: true })
  @IsArray()
  @IsEnum(AnalyticType, { each: true })
  analyticTypes: AnalyticType[];

  @ApiProperty({ enum: StatisticsDisplayType })
  @IsEnum(StatisticsDisplayType)
  displayType: StatisticsDisplayType;

  @ApiProperty({ enum: TimeRange })
  @IsEnum(TimeRange)
  timeRange: TimeRange;

  @ApiProperty({ type: Layout })
  @IsObject()
  layout: Layout;

  @ApiProperty()
  @IsBoolean()
  showLegend: boolean;
}
