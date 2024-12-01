import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsNumber()
  organization_id: number;

  @IsOptional()
  @IsNumber()
  departamento_id?: number;

  @IsOptional()
  config?: Record<string, unknown>;
}
