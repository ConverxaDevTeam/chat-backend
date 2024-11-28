import { timeout } from "rxjs";

class DummyAgent {
  constructor(private agentId: number, private userId: number) {
    console.log(`Agent ${agentId} created for user ${userId}`);
  }
  
  async response(message: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return Promise.resolve(`Dummy response to: ${message}`);
  }
}

export const getAgentResponse = async (agent_id:number, user_id: number, message: string): Promise<string> => {
  const agente = new DummyAgent(agent_id, user_id);
  
  return await agente.response(message)
}
