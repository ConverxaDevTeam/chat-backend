import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateCustomPlanDto {
  @ApiProperty({
    description: 'The number of conversations allowed for the custom plan.',
    example: 1000,
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  conversationCount: number;
}
