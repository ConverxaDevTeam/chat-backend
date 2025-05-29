import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateOrganizationLimitDto {
  @ApiProperty({ description: 'Límite de conversaciones para la organización', example: 50 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  conversationLimit: number;

  @ApiProperty({ description: 'Duración en días del límite', example: 15 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  durationDays: number;

  @ApiProperty({ description: 'Indica si el límite es mensual', example: false })
  @IsBoolean()
  @IsOptional()
  isMonthly?: boolean;

  @ApiProperty({ description: 'ID de la organización', example: 1 })
  @IsInt()
  @IsNotEmpty()
  organizationId: number;
}

export class UpdateOrganizationLimitDto {
  @ApiProperty({ description: 'Límite de conversaciones para la organización', example: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  conversationLimit?: number;

  @ApiProperty({ description: 'Duración en días del límite', example: 15 })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number;

  @ApiProperty({ description: 'Indica si el límite es mensual', example: false })
  @IsBoolean()
  @IsOptional()
  isMonthly?: boolean;
}
