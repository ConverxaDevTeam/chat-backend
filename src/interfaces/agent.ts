import { FunctionResponse } from './function.interface';

export enum AgenteType {
  SOFIA_ASISTENTE = 'sofia_asistente',
  LLAMA = 'llama',
  GROK = 'grok',
}

export interface SofiaLLMConfig {
  type: AgenteType.SOFIA_ASISTENTE;
  config: {
    instruccion: string;
    agentId?: string;
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

export interface StartAgentConfig {
  agentId: string;
  funciones?: FunctionResponse[];
}

export interface CreateAgentConfig {
  name: string;
  instruccion: string;
  agentId: string;
}

export interface RunAgentConfig {
  agentId: string;
  threadId: string;
}

export type AgentConfig = StartAgentConfig | RunAgentConfig;

export type agentIdentifier = ChatAgentIdentifier | ThreatAgentIdentifier | TestAgentIdentifier;
