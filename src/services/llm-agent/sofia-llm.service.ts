import OpenAI from 'openai';
import { AgentConfig, agentIdentifier, RunAgentConfig, StartAgentConfig } from 'src/interfaces/agent';
import { BaseAgent } from './base-agent';

export class SofiaLLMService extends BaseAgent {
  private openai: OpenAI;
  private assistantId: string | null = null;

  constructor(
    identifier: agentIdentifier,
    private readonly agenteConfig?: AgentConfig,
  ) {
    super(identifier);
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async init(): Promise<void> {
    await super.init();
  }

  protected async initializeAgent(): Promise<void> {
    if (this.assistantId) return;
    console.log(this.agenteConfig);
    if ((this.agenteConfig as StartAgentConfig)?.instruccion) {
      const assistant = await this.openai.beta.assistants.create({
        name: (this.agenteConfig as StartAgentConfig).name,
        instructions: this.getContextualizedInstructions() + '\n' + (this.agenteConfig as StartAgentConfig).instruccion,
        model: 'gpt-4o-mini',
      });
      this.assistantId = assistant.id;
      this.threadId = await this.createThread();
      return;
    }
    if (!(this.agenteConfig as RunAgentConfig)?.threadId) throw new Error("No se pudo obtener la configuracion del agente");  
    this.threadId = (this.agenteConfig as RunAgentConfig).threadId;
    this.assistantId = (this.agenteConfig as RunAgentConfig).agentId;
  }

  protected async createThread(): Promise<string> {
    const thread = await this.openai.beta.threads.create();
    this.threadId = thread.id;
    return thread.id;
  }

  protected async addMessageToThread(message: string): Promise<void> {
    if (!this.threadId) throw new Error('Thread not initialized');
    await this.openai.beta.threads.messages.create(this.threadId, {
      role: 'user',
      content: message,
    });
  }

  protected async runAgent(threadId: string): Promise<any> {
    const run = await this.openai.beta.threads.runs.create(
      threadId,
      { assistant_id: this.assistantId! }
    );

    // Wait for the run to complete
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);

      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }
    }
  }

  protected async getResponse(): Promise<string> {
    if (!this.threadId) throw new Error('Thread not initialized');
    const messages = await this.openai.beta.threads.messages.list(this.threadId);
    const lastMessage = messages.data[0];

    if (lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    return lastMessage.content[0].type === 'text' ? lastMessage.content[0].text.value : '';
  }

  async response(message: string, context?: any): Promise<string> {
    await this.initializeAgent();

    await this.addMessageToThread( message);
    await this.runAgent(this.threadId!);
    const response = await this.getResponse();

    return this.validateResponse(response);
  }

  public getAgentId(): string {
    if (!this.assistantId) throw new Error('Assistant not initialized');
    return this.assistantId;
  }
}
