export enum FunctionType {
  API_ENDPOINT = 'apiEndpoint',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export interface FunctionParam {
  id?: string;
  name: string;
  type: string;
  description: string;
}

export interface HttpRequestFunction {
  type: FunctionType.API_ENDPOINT;
  config: {
    url?: string;
    method?: HttpMethod;
    requestBody?: FunctionParam[];
  };
}
export interface CreateFunctionDto {
  name: string;
  type: FunctionType;
  config: Record<string, unknown>;
  agentId: number;
  autenticadorId?: number;
}

export interface UpdateFunctionDto<T extends { type: string; config: Record<string, unknown> }> {
  name: string;
  type: T['type'];
  config: T['config'];
  autenticadorId?: number;
}

export interface FunctionResponse {
  id: number;
  name: string;
  type: FunctionType;
  config: Record<string, unknown>;
  agentId: number;
  autenticadorId?: number;
  createdAt: Date;
  updatedAt: Date;
}
