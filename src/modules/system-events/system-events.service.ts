import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemEvent, EventType, TableName } from '@models/SystemEvent.entity';
import { Organization } from '@models/Organization.entity';
import { Conversation } from '@models/Conversation.entity';

interface CreateEventParams {
  type: EventType;
  metadata: Record<string, any>;
  organization?: Organization;
  table_name: TableName;
  table_id: number;
  conversation?: Conversation;
  error_message?: string;
}

@Injectable()
export class SystemEventsService {
  constructor(
    @InjectRepository(SystemEvent)
    private readonly systemEventRepository: Repository<SystemEvent>,
  ) {}

  async create(params: CreateEventParams): Promise<SystemEvent> {
    return this.systemEventRepository.save({
      ...params,
      created_at: new Date(),
    });
  }

  // Eventos de función
  async logFunctionCall(params: {
    functionId: number;
    params: Record<string, any>;
    result?: any;
    error?: Error;
    organizationId: number;
    functionName: string;
    conversationId: number;
  }): Promise<SystemEvent> {
    // Determinar el tipo de evento basado en el error
    let eventType = params.error ? EventType.FUNCTION_EXECUTION_FAILED : EventType.FUNCTION_CALL;
    
    // Detectar errores de validación de parámetros
    if (params.error) {
      const errorMessage = params.error.message || '';
      // Verificar si es un error de validación de parámetros
      if (
        errorMessage.includes('Falta parámetro requerido') || 
        errorMessage.includes('Parámetro incorrecto') ||
        errorMessage.includes('required parameter') ||
        errorMessage.includes('validation failed')
      ) {
        eventType = EventType.FUNCTION_PARAM_VALIDATION_ERROR;
      }
    }

    return this.create({
      type: eventType,
      metadata: {
        params: params.params,
        result: params.result,
        error: params.error?.message,
        functionName: params.functionName,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.FUNCTIONS,
      table_id: params.functionId,
      conversation: params.conversationId > 0 ? ({ id: params.conversationId } as Conversation) : undefined,
      error_message: params.error?.message,
    });
  }

  // Eventos de conversación
  async logConversationEvent(params: {
    conversationId: number;
    type: EventType.CONVERSATION_CREATED | EventType.CONVERSATION_CLOSED | EventType.CONVERSATION_ASSIGNED;
    metadata?: Record<string, any>;
    organizationId: number;
    departmentId: number;
  }): Promise<SystemEvent> {
    return this.create({
      type: params.type,
      metadata: {
        ...params.metadata,
        department_id: params.departmentId,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.CONVERSATIONS,
      table_id: params.conversationId,
    });
  }

  // Eventos de sistema
  async logSystemError(params: { organizationId: number; error: Error; context?: string }): Promise<SystemEvent> {
    return this.create({
      type: EventType.SYSTEM_ERROR,
      metadata: {
        error: params.error.message,
        stack: params.error.stack,
        context: params.context,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.SYSTEM,
      table_id: 0,
      error_message: params.error.message,
    });
  }

  // Consultas
  async findByOrganizationId(organizationId: number): Promise<SystemEvent[]> {
    return this.systemEventRepository.find({
      where: { organization: { id: organizationId } },
      order: { created_at: 'DESC' },
    });
  }

  async findByTableAndId(tableName: TableName, tableId: number): Promise<SystemEvent[]> {
    return this.systemEventRepository.find({
      where: { table_name: tableName, table_id: tableId },
      order: { created_at: 'DESC' },
    });
  }
}
