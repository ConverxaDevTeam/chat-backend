import { AgenteType, AgentIdentifierType } from './agent';

export interface ConversationConfigBase {
  type: AgenteType;
  agentIdentifier: {
    agentId?: string;
    type: AgentIdentifierType;
    threatId?: string;
  };
}

export interface SofiaConversationConfig extends ConversationConfigBase {
  type: AgenteType.SOFIA_ASISTENTE;
  agentIdentifier: {
    agentId?: string;
    type: AgentIdentifierType.CHAT | AgentIdentifierType.THREAT;
    threatId?: string;
  };
}
