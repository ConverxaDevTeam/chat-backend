import { IsString, IsOptional, IsNumber } from 'class-validator';
import { AgenteType } from 'src/interfaces/agent';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsString()
  type: AgenteType;

  @IsNumber()
  organization_id: number;

  @IsOptional()
  @IsNumber()
  chat_id?: number;

  @IsOptional()
  @IsNumber()
  departamento_id?: number;

  @IsOptional()
  config?: Record<string, unknown>;
}
