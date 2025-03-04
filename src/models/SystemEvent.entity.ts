import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Organization } from './Organization.entity';
import { Conversation } from './Conversation.entity';

export enum EventType {
  // Función
  FUNCTION_CALL = 'FUNCTION_CALL',
  FUNCTION_CREATED = 'FUNCTION_CREATED',
  FUNCTION_UPDATED = 'FUNCTION_UPDATED',
  FUNCTION_DELETED = 'FUNCTION_DELETED',
  FUNCTION_EXECUTION_STARTED = 'FUNCTION_EXECUTION_STARTED',
  FUNCTION_EXECUTION_COMPLETED = 'FUNCTION_EXECUTION_COMPLETED',
  FUNCTION_EXECUTION_FAILED = 'FUNCTION_EXECUTION_FAILED',
  FUNCTION_PARAM_VALIDATION_ERROR = 'FUNCTION_PARAM_VALIDATION_ERROR',
  FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',

  // Mensajes
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',

  // Sesión/Conversación
  SESSION_STARTED = 'SESSION_STARTED',
  SESSION_ENDED = 'SESSION_ENDED',
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  CONVERSATION_CLOSED = 'CONVERSATION_CLOSED',
  CONVERSATION_ASSIGNED = 'CONVERSATION_ASSIGNED',

  // Usuario
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',

  // Agente
  AGENT_CREATED = 'AGENT_CREATED',
  AGENT_UPDATED = 'AGENT_UPDATED',
  AGENT_DELETED = 'AGENT_DELETED',
  AGENT_ASSIGNED = 'AGENT_ASSIGNED',
  AGENT_INITIALIZED = 'AGENT_INITIALIZED',
  AGENT_RESPONSE_STARTED = 'AGENT_RESPONSE_STARTED',
  AGENT_RESPONSE_COMPLETED = 'AGENT_RESPONSE_COMPLETED',
  AGENT_RESPONSE_FAILED = 'AGENT_RESPONSE_FAILED',
  AGENT_MESSAGE_ADDED = 'AGENT_MESSAGE_ADDED',
  AGENT_VECTOR_STORE_CREATED = 'AGENT_VECTOR_STORE_CREATED',
  AGENT_VECTOR_STORE_DELETED = 'AGENT_VECTOR_STORE_DELETED',
  AGENT_VECTOR_STORE_ERROR = 'AGENT_VECTOR_STORE_ERROR',
  AGENT_FILE_UPLOADED = 'AGENT_FILE_UPLOADED',
  AGENT_FILE_UPLOAD_ERROR = 'AGENT_FILE_UPLOAD_ERROR',
  AGENT_FILE_DELETED = 'AGENT_FILE_DELETED',
  AGENT_FILE_DELETE_ERROR = 'AGENT_FILE_DELETE_ERROR',
  AGENT_TOOLS_UPDATED = 'AGENT_TOOLS_UPDATED',
  AGENT_THREAD_CREATED = 'AGENT_THREAD_CREATED',

  // Sistema
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  CONFIG_CHANGED = 'CONFIG_CHANGED',
}

export enum TableName {
  USERS = 'users',
  SESSIONS = 'sessions',
  CONVERSATIONS = 'conversations',
  FUNCTIONS = 'functions',
  MESSAGES = 'messages',
  AGENTS = 'agents',
  DEPARTMENTS = 'departments',
  ORGANIZATIONS = 'organizations',
  SYSTEM = 'system',
}

@Entity('system_events')
export class SystemEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'enum', enum: TableName })
  table_name: TableName;

  @Column()
  table_id: number;

  @ManyToOne(() => Conversation, { nullable: true })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ nullable: true })
  error_message: string;
}
