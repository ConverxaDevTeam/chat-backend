import { IsString, IsEnum, IsObject, IsNumber, IsOptional, ValidateNested, IsArray, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum FunctionType {
  API_ENDPOINT = 'apiEndpoint',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export class FunctionParam {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  description: string;

  @IsBoolean()
  required: boolean;
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

export enum ApiKeyInjectPlaces {
  HEADER = 'header',
  QUERY_PARAM = 'query_PARAMS',
}

export enum AutenticadorType {
  ENDPOINT = 'endpoint',
  API_KEY = 'api_key',
}

export enum injectPlaces {
  BEARER_HEADER = 'bearerHeader',
}

export interface BearerConfig {
  injectPlace: injectPlaces.BEARER_HEADER;
  injectConfig: {
    tokenPath: string;
    refreshPath: string;
  };
}

export interface ApiKeyAutenticador {
  type: AutenticadorType.API_KEY;
  config: {
    injectPlace: ApiKeyInjectPlaces;
    key: string;
  };
}

export interface HttpAutenticador<T extends { injectPlace: injectPlaces; injectConfig: Record<string, unknown> }> {
  type: AutenticadorType.ENDPOINT;
  config: {
    url: string;
    method: HttpMethod;
    params: Record<string, string>;
    injectPlace: T['injectPlace'];
    injectConfig: T['injectConfig'];
  };
}

export interface Autenticador<T extends { type: AutenticadorType; config: Record<string, unknown> } = { type: AutenticadorType; config: Record<string, unknown> }> {
  type: T['type'];
  config: T['config'];
}
