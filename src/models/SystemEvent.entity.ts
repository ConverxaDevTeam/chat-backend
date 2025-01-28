import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum EventType {
  // Función
  FUNCTION_CALL = 'FUNCTION_CALL',
  FUNCTION_CREATED = 'FUNCTION_CREATED',
  FUNCTION_UPDATED = 'FUNCTION_UPDATED',
  FUNCTION_DELETED = 'FUNCTION_DELETED',

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

  @Column()
  organization_id: number;

  @Column({ type: 'enum', enum: TableName })
  table_name: TableName;

  @Column()
  table_id: number;

  @Column({ nullable: true })
  error_message: string;
}
