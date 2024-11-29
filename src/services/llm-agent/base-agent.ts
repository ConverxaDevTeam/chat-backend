import { agentIdentifier } from 'src/interfaces/agent';

export abstract class BaseAgent {
  protected threadId: string | null = null;

  constructor(protected identifier: agentIdentifier) {}

  public getThreadId(): string | undefined {
    return this.threadId || undefined;
  }

  abstract response(message: string, context?: any): Promise<string>;

  protected async initializeAgent(): Promise<void> {
    // Base initialization logic if needed
  }

  protected async createThread(): Promise<any> {
    // Base thread creation logic if needed
    return null;
  }

  protected async addMessageToThread(threadId: string, message: string): Promise<void> {
    // Base message adding logic
  }

  protected async runAgent(threadId: string): Promise<any> {
    // Base agent running logic
    return null;
  }

  protected async getResponse(threadId: string): Promise<string> {
    // Base response retrieval logic
    return '';
  }

  protected async validateResponse(response: string): Promise<string> {
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from agent');
    }
    return response.trim();
  }

  protected getContextualizedInstructions(): string {
    const baseInstructions = '';
    return  baseInstructions;
  }

  async init(): Promise<void> {
    if (this.identifier.type === 'chat') {
      await this.initializeAgent();
    }
  }
}
