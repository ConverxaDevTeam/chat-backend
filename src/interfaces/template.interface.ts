import { Autenticador } from '@models/agent/Autenticador.entity';
import { ParamType } from './function-param.interface';

export interface FunctionTemplateCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunctionTemplateApplication {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunctionTemplateParam {
  name: string;
  title: string;
  description?: string;
  type: ParamType;
  required?: boolean;
  enumValues?: string[];
  defaultValue?: any;
  properties?: FunctionTemplateParam[];
}

export interface FunctionTemplate {
  id: number;
  name: string;
  description?: string;
  categoryId: number;
  category?: FunctionTemplateCategory;
  applicationId: number;
  application?: FunctionTemplateApplication;
  tags: string[];
  authenticatorId?: number;
  authenticator?: Autenticador;
  url: string;
  method: string;
  bodyType: string;
  params: FunctionTemplateParam[];
  headers: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId: number;
}

export interface CreateFunctionTemplateDto {
  name: string;
  description: string;
  categoryId: number;
  applicationId: number;
  tags: string[];
  authenticatorId?: number;
  url: string;
  method?: string;
  bodyType?: string;
  params: FunctionTemplateParam[];
  organizationId: number;
}

export interface UpdateFunctionTemplateDto {
  name?: string;
  description?: string;
  categoryId?: number;
  applicationId?: number;
  tags?: string[];
  authenticatorId?: number;
  url?: string;
  method?: string;
  bodyType?: string;
  params?: FunctionTemplateParam[];
}
