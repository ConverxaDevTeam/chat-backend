import { IsString, IsEnum, IsObject, IsNumber, IsOptional, ValidateNested, IsArray, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export enum FunctionType {
  API_ENDPOINT = 'apiEndpoint',
  // Futuros tipos de funciones
  // WEBSOCKET = 'websocket',
  // DATABASE = 'database',
  // etc...
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export class FunctionParam {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  description: string;
}

export class HttpRequestConfig {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(HttpMethod)
  method?: HttpMethod;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunctionParam)
  requestBody?: FunctionParam[];
}

// Tipos de configuración según el tipo de función
export type FunctionConfig = {
  [FunctionType.API_ENDPOINT]: HttpRequestConfig;
  // [FunctionType.WEBSOCKET]: WebSocketConfig;
  // [FunctionType.DATABASE]: DatabaseConfig;
  // etc...
};

export class BaseFunctionDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  agentId: number;

  @IsOptional()
  @IsNumber()
  autenticadorId?: number;
}

export class CreateFunctionDto<T extends FunctionType = FunctionType> extends BaseFunctionDto {
  @IsEnum(FunctionType)
  type: T;

  @IsObject()
  @ValidateNested()
  config: FunctionConfig[T];
}

export class UpdateFunctionDto<T extends FunctionType = FunctionType> extends BaseFunctionDto {
  @IsEnum(FunctionType)
  type: T;

  @IsObject()
  @ValidateNested()
  config: FunctionConfig[T];
}

export class FunctionResponse {
  @IsNumber()
  id: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(FunctionType)
  type: FunctionType;

  @IsObject()
  config: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  autenticadorId?: number;
}
