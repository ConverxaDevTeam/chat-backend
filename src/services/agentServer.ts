class DummyAgent {
  constructor(private identifier: agentIdentifier) {
    if (identifier.type === 'chat') {
      console.log(`Chat Agent created for chat_id: ${identifier.chat_id}`);
    } else {
      console.log(`Threat Agent created for threat_id: ${identifier.threat_id}`);
    }
  }
  
  async response(message: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const agentType = this.identifier.type === 'chat' ? 'Chat' : 'Threat';
    return Promise.resolve(`${agentType} Agent response to: ${message}`);
  }
}

interface ChatAgentIdentifier {
  chat_id?: number;
  type: 'chat'
}
interface ThreatAgentIdentifier {
  threat_id?: string;
  type: 'threat'
}
type agentIdentifier = ChatAgentIdentifier | ThreatAgentIdentifier
/*** puede venir con chat_id o con threat_id uno de los dos es necesario */
export const getAgentResponse = async (message: string, identifier: agentIdentifier): Promise<string> => {
  
  const agente = new DummyAgent(identifier);
  
  return await agente.response(message)
}
