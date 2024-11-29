export enum AgenteType {
  SOFIA_ASISTENTE = 'sofia_asistente',
  LLAMA = 'llama',
  GROK = 'grok',
}

export interface ChatAgentIdentifier {
  chat_id?: number;
  type: 'chat';
}

export interface ThreatAgentIdentifier {
  threat_id?: string;
  type: 'threat';
}

export interface TestAgentIdentifier {
  threat_id: string;
  agent: AgenteType;
  type: 'test';
}

export interface AgentConfig {
  instruccion: string;
  name?: string;
}

export type agentIdentifier = ChatAgentIdentifier | ThreatAgentIdentifier;
