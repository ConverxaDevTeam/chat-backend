export enum AgenteType {
  SOFIA_ASISTENTE = 'sofia_asistente',
  LLAMA = 'llama',
  GROK = 'grok',
}

export enum AgentIdentifierType {
  CHAT = 'chat',
  CHAT_TEST = 'chatTest',
  THREAT = 'threat',
  TEST = 'test',
}

export interface ChatAgentIdentifier {
  chatId?: number;
  type: AgentIdentifierType.CHAT | AgentIdentifierType.CHAT_TEST;
}

export interface ThreatAgentIdentifier {
  threatId?: string;
  type: AgentIdentifierType.THREAT;
}

export interface TestAgentIdentifier {
  threatId: string;
  agentId: string;
  agent: AgenteType;
  type: AgentIdentifierType.TEST;
}

export interface StartAgentConfig {
  instruccion: string;
  name?: string;
}

export interface RunAgentConfig {
  agentId: string;
  threadId: string;
}
export type AgentConfig = StartAgentConfig | RunAgentConfig;

export type agentIdentifier = ChatAgentIdentifier | ThreatAgentIdentifier | TestAgentIdentifier;
