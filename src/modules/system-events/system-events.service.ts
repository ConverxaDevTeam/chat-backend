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

  async create(params: CreateEventParams): Promise<SystemEvent | null> {
    if (params.conversation?.id === -1) {
      return null;
    }
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
  }): Promise<SystemEvent | null> {
    if (params.conversationId === -1) return null;
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
  }): Promise<SystemEvent | null> {
    if (params.conversationId === -1) return null;
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
  async logSystemError(params: { organizationId: number; error: Error; context?: string }): Promise<SystemEvent | null> {
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

  // Eventos de agente
  async logAgentEvent(params: {
    agentId: number;
    type:
      | EventType.AGENT_CREATED
      | EventType.AGENT_UPDATED
      | EventType.AGENT_DELETED
      | EventType.AGENT_ASSIGNED
      | EventType.AGENT_INITIALIZED
      | EventType.AGENT_RESPONSE_STARTED
      | EventType.AGENT_RESPONSE_COMPLETED
      | EventType.AGENT_RESPONSE_FAILED
      | EventType.AGENT_MESSAGE_ADDED
      | EventType.AGENT_VECTOR_STORE_CREATED
      | EventType.AGENT_VECTOR_STORE_DELETED
      | EventType.AGENT_FILE_UPLOADED
      | EventType.AGENT_FILE_DELETED
      | EventType.AGENT_TOOLS_UPDATED
      | EventType.AGENT_THREAD_CREATED;
    metadata?: Record<string, any>;
    organizationId: number;
    conversationId?: number;
    error?: Error;
  }): Promise<SystemEvent | null> {
    if (params.conversationId === -1) return null;
    return this.create({
      type: params.type,
      metadata: {
        ...params.metadata,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      conversation: params.conversationId ? ({ id: params.conversationId } as Conversation) : undefined,
      error_message: params.error?.message,
    });
  }

  async logAgentResponse(params: {
    agentId: number;
    message: string;
    organizationId: number;
    conversationId: number;
    responseTime: number;
    error?: Error;
  }): Promise<SystemEvent | null> {
    if (params.conversationId === -1) return null;
    const eventType = params.error ? EventType.AGENT_RESPONSE_FAILED : EventType.AGENT_RESPONSE_COMPLETED;

    return this.create({
      type: eventType,
      metadata: {
        message: params.message,
        response_time: params.responseTime,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      conversation: { id: params.conversationId } as Conversation,
      error_message: params.error?.message,
    });
  }

  async logAgentVectorStoreEvent(params: {
    agentId: number;
    type: EventType.AGENT_VECTOR_STORE_CREATED | EventType.AGENT_VECTOR_STORE_DELETED;
    vectorStoreId: string;
    organizationId: number;
    error?: Error;
  }): Promise<SystemEvent | null> {
    return this.create({
      type: params.type,
      metadata: {
        vector_store_id: params.vectorStoreId,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      error_message: params.error?.message,
    });
  }

  async logAgentFileEvent(params: {
    agentId: number;
    type: EventType.AGENT_FILE_UPLOADED | EventType.AGENT_FILE_DELETED;
    fileId: string;
    organizationId: number;
    error?: Error;
  }): Promise<SystemEvent | null> {
    return this.create({
      type: params.type,
      metadata: {
        file_id: params.fileId,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      error_message: params.error?.message,
    });
  }

  async logAgentToolsUpdate(params: { agentId: number; organizationId: number; functions: any[]; hitl: boolean; error?: Error }): Promise<SystemEvent | null> {
    if (params.organizationId === -1) return null;
    return this.create({
      type: EventType.AGENT_TOOLS_UPDATED,
      metadata: {
        functions: params.functions,
        hitl: params.hitl,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      error_message: params.error?.message,
    });
  }

  async logAgentThreadEvent(params: { agentId: number; threadId: string; organizationId: number; conversationId?: number; error?: Error }): Promise<SystemEvent | null> {
    if (params.conversationId === -1) return null;
    return this.create({
      type: EventType.AGENT_THREAD_CREATED,
      metadata: {
        thread_id: params.threadId,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      conversation: params.conversationId ? ({ id: params.conversationId } as Conversation) : undefined,
      error_message: params.error?.message,
    });
  }

  async logVectorStoreError(params: {
    agentId: number;
    type: EventType.AGENT_VECTOR_STORE_ERROR | EventType.AGENT_FILE_UPLOAD_ERROR | EventType.AGENT_FILE_DELETE_ERROR;
    vectorStoreId?: string;
    fileId?: string;
    organizationId: number;
    error: Error;
  }): Promise<SystemEvent | null> {
    return this.create({
      type: params.type,
      metadata: {
        vector_store_id: params.vectorStoreId,
        file_id: params.fileId,
        error: params.error?.message,
        stack: params.error?.stack,
      },
      organization: { id: params.organizationId } as Organization,
      table_name: TableName.AGENTS,
      table_id: params.agentId,
      error_message: params.error?.message,
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
