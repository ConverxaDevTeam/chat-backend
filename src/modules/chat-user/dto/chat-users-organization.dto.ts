import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IntegrationType } from '@models/Integration.entity';
import { MessageType } from '@models/Message.entity';

export enum ChatUserSortBy {
  LAST_ACTIVITY = 'last_activity',
  USER_NAME = 'user_name',
  UNREAD_MESSAGES = 'unread_messages',
  NEED_HUMAN = 'need_human',
  CREATED_AT = 'created_at',
}

export enum SearchType {
  ID = 'id',
  NAME = 'name',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ConversationStatus {
  IA = 'ia',
  PENDIENTE = 'pendiente',
  ASIGNADO = 'asignado',
}

export class ChatUsersOrganizationDto {
  // Paginación para scroll infinito
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

  // Filtros de búsqueda específica
  @ApiPropertyOptional({
    enum: SearchType,
    description: 'Tipo de búsqueda: "id" para buscar por ID del chat user, "name" para buscar por nombre',
  })
  @IsOptional()
  @IsEnum(SearchType)
  searchType?: SearchType;

  @ApiPropertyOptional({ description: 'Valor a buscar (búsqueda case-insensitive con coincidencias parciales)' })
  @IsOptional()
  @IsString()
  searchValue?: string;

  // Filtros de conversación
  @ApiPropertyOptional({ description: 'Filtro por nombre de departamento de la conversación más reciente' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    enum: IntegrationType,
    description: 'Tipo de integración de la conversación más reciente (se mapea automáticamente: whatsapp_manual -> whatsapp, messenger_manual -> messenger)',
  })
  @IsOptional()
  @IsEnum(IntegrationType)
  integrationType?: IntegrationType;

  @ApiPropertyOptional({
    enum: ConversationStatus,
    description: 'Estado de la conversación más reciente: ia (sin HITL), pendiente (necesita HITL, no asignado), asignado (asignado a usuario)',
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Conversación más reciente que necesita intervención humana' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  needHuman?: boolean;

  @ApiPropertyOptional({ description: 'Solo chat users con conversaciones asignadas al usuario logueado' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  assignedToMe?: boolean;

  @ApiPropertyOptional({ description: 'Solo chat users con mensajes no leídos' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  hasUnreadMessages?: boolean;

  // Filtros de fecha
  @ApiPropertyOptional({ description: 'Fecha de inicio de última actividad (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin de última actividad (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  // Ordenamiento
  @ApiPropertyOptional({
    enum: ChatUserSortBy,
    description: 'Campo por el cual ordenar',
    default: ChatUserSortBy.LAST_ACTIVITY,
  })
  @IsOptional()
  @IsEnum(ChatUserSortBy)
  sortBy?: ChatUserSortBy = ChatUserSortBy.LAST_ACTIVITY;

  @ApiPropertyOptional({
    enum: SortOrder,
    description: 'Orden ascendente o descendente',
    default: SortOrder.DESC,
  })
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

export interface ChatUserWithLastConversation {
  chat_user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  avatar: string | null;
  secret: string;
  identifier: string;
  last_conversation: {
    conversation_id: number;
    last_message_text: string;
    last_message_created_at: string;
    last_message_type: MessageType;
    unread_messages: number;
    need_human: boolean;
    assigned_user_id: number | null;
    integration_type: string;
    department: string;
    last_activity: string;
    status: ConversationStatus;
  };
}

export interface ChatUsersOrganizationResponse {
  ok: boolean;
  chat_users: ChatUserWithLastConversation[];
  pagination: PaginationMeta;
  appliedFilters: {
    searchType?: SearchType;
    searchValue?: string;
    department?: string;
    integrationType?: IntegrationType;
    status?: ConversationStatus;
    needHuman?: boolean;
    assignedToMe?: boolean;
    hasUnreadMessages?: boolean;
    dateFrom?: string;
    dateTo?: string;
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
