export enum FunctionType {
  API_ENDPOINT = 'apiEndpoint',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

export interface HttpRequestConfig {
  url?: string;
  method?: HttpMethod;
  requestBody?: any; // Por ahora lo dejamos como any hasta implementar FunctionParam
}

export interface CreateFunctionDto {
  name: string;
  type: FunctionType;
  config: Record<string, unknown>;
  agentId: number;
  autenticadorId?: number;
}

export interface UpdateFunctionDto {
  name?: string;
  type?: FunctionType;
  config?: Record<string, unknown>;
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
