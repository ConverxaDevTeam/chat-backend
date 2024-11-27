
class DummyAgent {
  constructor(private agentId: number) {
    console.log(`Agent ${agentId} created`);
  }
  
  response(message: string): Promise<string> {
    return Promise.resolve(`Dummy response to: ${message}`);
  }
}

export const getAgentResponse = (agent_id:number, message: string): Promise<string> => {
  const agente = new DummyAgent(agent_id);
  return agente.response(message)
}
