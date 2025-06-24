import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { OrganizationType } from '@models/Organization.entity';

export class ChangeOrganizationTypeDto {
  @ApiProperty({
    description: 'The type of organization',
    enum: OrganizationType,
    example: OrganizationType.PRODUCTION,
  })
  @IsEnum(OrganizationType)
  type: OrganizationType;

  @ApiProperty({
    description: 'The number of days until the plan needs to be updated (only required for CUSTOM type)',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  daysToUpdate?: number;
}
