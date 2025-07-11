import { Message } from '@models/Message.entity';
import { FunctionResponse } from './function.interface';

export const UserFunctionPrefix = 'user__';

export const HitlName = 'converxa__hitl';

export enum AgenteType {
  CONVERXA_ASISTENTE = 'converxa_asistente',
  CLAUDE = 'claude',
}

export interface ConverxaLLMConfig {
  type: AgenteType.CONVERXA_ASISTENTE;
  config: {
    instruccion: string;
    agentId?: string;
    vectorStoreId?: string;
  };
}

export enum AgentIdentifierType {
  CHAT = 'chat',
  CHAT_TEST = 'chatTest',
  THREAT = 'threat',
  TEST = 'test',
}

export interface ChatAgentIdentifier {
  agentId?: string;
  type: AgentIdentifierType.CHAT;
}

export interface chatTestAgentIdentifier {
  agentId: number;
  type: AgentIdentifierType.CHAT_TEST;
}

export interface ThreatAgentIdentifier {
  threatId: string;
  agentId: string;
  type: AgentIdentifierType.THREAT;
}

export interface TestAgentIdentifier {
  threatId: string;
  LLMAgentId: string;
  agentId: number;
  agent: AgenteType;
  type: AgentIdentifierType.TEST;
}

export interface CreateAgentConfig {
  name: string;
  instruccion: string;
  agentId: string;
  DBagentId: number;
  funciones?: FunctionResponse[];
  organizationId: number;
  organizationName?: string;
  messages?: Message[];
  fileIds?: string[];
}

export interface AgentConfig {
  agentId: string;
  threadId?: string;
  DBagentId?: number;
  funciones?: FunctionResponse[];
  organizationId: number;
}

export type agentIdentifier = ChatAgentIdentifier | ThreatAgentIdentifier | TestAgentIdentifier;
