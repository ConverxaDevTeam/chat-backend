import { AgenteType, AgentIdentifierType } from './agent';

export interface ConversationConfigBase {
  type: AgenteType;
  agentIdentifier: {
    agentId?: string;
    type: AgentIdentifierType;
    threatId?: string;
  };
}

export interface ConverxaConversationConfig extends ConversationConfigBase {
  type: AgenteType.CONVERXA_ASISTENTE;
  agentIdentifier: {
    agentId?: string;
    type: AgentIdentifierType.CHAT | AgentIdentifierType.THREAT;
    threatId?: string;
  };
}
