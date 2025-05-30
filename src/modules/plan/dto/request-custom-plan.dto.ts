import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class RequestCustomPlanDto {
  @ApiProperty({
    description: 'The ID of the organization for which the custom plan is requested.',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  organizationId: number;
}
