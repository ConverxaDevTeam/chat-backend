import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Department name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsNumber()
  @IsNotEmpty()
  organizacion_id: number;
}
