import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { AnalyticType } from '../../../interfaces/analytics.enum';

export class GetAnalyticsDto {
  @ApiProperty()
  @IsNumber()
  organizationId: number;

  @ApiProperty({ enum: AnalyticType, isArray: true })
  @IsArray()
  @IsEnum(AnalyticType, { each: true })
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
