import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { AgenteType } from 'src/interfaces/agent';

// DTOs para configuraciones específicas
export class SofiaConfigDto {
  @IsString()
  instruccion: string;

  @IsOptional()
  @IsString()
  agentId?: string;
}

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsEnum(AgenteType)
  type: AgenteType;

  @IsNumber()
  organization_id: number;

  @IsOptional()
  @IsNumber()
  departamento_id?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SofiaConfigDto)
  config?: SofiaConfigDto;
}
