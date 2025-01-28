import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { AnalyticType } from '../../../interfaces/analytics.enum';

export class GetAnalyticsDto {
  @ApiProperty()
  @IsNumber()
  organizationId: number;

  @ApiProperty({ enum: AnalyticType, isArray: true })
  @IsArray()
  @IsEnum(AnalyticType, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return Array.isArray(value) ? value : [value];
  })
  analyticTypes: AnalyticType[];

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
