import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHitlTypeDto {
  @ApiProperty({
    description: 'Nombre del tipo HITL',
    example: 'soporte_tecnico',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Descripción del tipo HITL',
    example: 'Especialistas en soporte técnico avanzado',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
