import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { AgentConfig, agentIdentifier } from 'src/interfaces/agent';
import { BaseAgent } from './base-agent';

@Injectable()
export class SofiaLLMService extends BaseAgent {
  private openai: OpenAI;
  private assistant: OpenAI.Beta.Assistant | null = null;

  constructor(
    identifier: agentIdentifier,
    private readonly agenteConfig?: AgentConfig,
  ) {
    super(identifier);
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  protected async initializeAgent(): Promise<void> {
    if (!this.assistant) {
      if (!this.agenteConfig) throw new Error("No se pudo obtener la configuracion del agente");
      this.assistant = await this.openai.beta.assistants.create({
        name: this.agenteConfig.name,
        instructions: this.getContextualizedInstructions() + '\n' + this.agenteConfig.instruccion,
        model: 'gpt-4o-mini',
      });
    }
  }

  protected async createThread(): Promise<string> {
    const thread = await this.openai.beta.threads.create();
    this.threadId = thread.id;
    return thread.id;
  }

  protected async addMessageToThread(threadId: string, message: string): Promise<void> {
    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
  }

  protected async runAgent(threadId: string): Promise<void> {
    if (!this.assistant) {
      throw new Error('Assistant not initialized');
    }

    const run = await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: this.assistant.id,
    });

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

  protected async getResponse(threadId: string): Promise<string> {
    const messages = await this.openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];

    if (lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    return lastMessage.content[0].type === 'text' ? lastMessage.content[0].text.value : '';
  }

  async response(message: string, context?: any): Promise<string> {
    await this.initializeAgent();

    const threadId = await this.createThread();
    await this.addMessageToThread(threadId, message);
    await this.runAgent(threadId);
    const response = await this.getResponse(threadId);

    return this.validateResponse(response);
  }
}
