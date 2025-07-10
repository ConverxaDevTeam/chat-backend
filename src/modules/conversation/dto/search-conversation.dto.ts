import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConversationType } from '@models/Conversation.entity';
import { IntegrationType } from '@models/Integration.entity';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ConversationSortBy {
  CREATED_AT = 'created_at',
  TYPE = 'type',
  NEED_HUMAN = 'need_human',
  DEPARTMENT = 'department',
}

export enum ConversationStatus {
  IA = 'ia',
  PENDIENTE = 'pendiente',
  ASIGNADO = 'asignado',
}

export class SearchConversationDto {
  // Filtros existentes (mantenemos compatibilidad)
  @ApiPropertyOptional({ description: 'ID específico de conversación' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  conversationId?: number;

  @ApiPropertyOptional({ description: 'Secret del chat user' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ enum: ConversationType, description: 'Tipo de conversación' })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  // Paginación
  @ApiPropertyOptional({ description: 'Número de página', minimum: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de elementos por página', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  // Filtros de búsqueda
  @ApiPropertyOptional({ description: 'Búsqueda de texto en nombre, email o teléfono del usuario' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtro por nombre de departamento' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    enum: IntegrationType,
    description: 'Tipo de integración (se mapea a tipo de conversación: whatsapp_manual -> whatsapp, messenger_manual -> messenger)',
  })
  @IsOptional()
  @IsEnum(IntegrationType)
  integrationType?: IntegrationType;

  // Filtros de estado
  @ApiPropertyOptional({ description: 'Conversaciones que necesitan intervención humana' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  needHuman?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por conversaciones asignadas (true) o no asignadas (false)' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  assignedToUser?: boolean;

  @ApiPropertyOptional({ description: 'ID del usuario asignado específico' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  assignedUserId?: number;

  @ApiPropertyOptional({ enum: ConversationStatus, description: 'Estado de la conversación: ia (sin HITL), pendiente (necesita HITL, no asignado), asignado (asignado a usuario)' })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  // Filtros de fecha
  @ApiPropertyOptional({ description: 'Fecha de inicio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Ordenamiento
  @ApiPropertyOptional({ enum: ConversationSortBy, description: 'Campo por el cual ordenar', default: ConversationSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(ConversationSortBy)
  sortBy?: ConversationSortBy = ConversationSortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, description: 'Orden ascendente o descendente', default: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ConversationListResponse {
  ok: boolean;
  conversations: any[];
  pagination: PaginationMeta;
  appliedFilters: {
    search?: string;
    department?: string;
    integrationType?: IntegrationType;
    needHuman?: boolean;
    assignedToUser?: boolean;
    assignedUserId?: number;
    status?: ConversationStatus;
    dateFrom?: string;
    dateTo?: string;
    type?: ConversationType;
  };
}

// Mapeo de tipos de integración a tipos de conversación
export const INTEGRATION_TO_CONVERSATION_TYPE_MAP = {
  chat_web: 'chat_web',
  whatsapp: 'whatsapp',
  whatsapp_manual: 'whatsapp',
  messenger: 'messenger',
  messenger_manual: 'messenger',
  slack: 'slack',
} as const;
