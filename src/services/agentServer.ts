import { timeout } from "rxjs";

class DummyAgent {
  constructor(private agentId: number) {
    console.log(`Agent ${agentId} created`);
  }
  
  async response(message: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return Promise.resolve(`Dummy response to: ${message}`);
  }
}

export const getAgentResponse = async (agent_id:number, message: string): Promise<string> => {
  const agente = new DummyAgent(agent_id);
  
  return await agente.response(message)
}
