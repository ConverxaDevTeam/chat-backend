import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignUsersHitlTypeDto {
  @ApiProperty({
    description: 'Array de IDs de usuarios a asignar al tipo HITL',
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  userIds: number[];
}
