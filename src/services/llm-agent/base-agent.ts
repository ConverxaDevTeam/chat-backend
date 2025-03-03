import { AgentConfig, agentIdentifier, CreateAgentConfig } from 'src/interfaces/agent';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { Funcion } from '@models/agent/Function.entity';
import { SystemEventsService } from '../../modules/system-events/system-events.service';
import { EventType } from '@models/SystemEvent.entity';

export abstract class BaseAgent {
  protected threadId: string | null = null;
  protected assistantId: string | null = null;
  protected agentId: number;
  protected organizationId: number | null = null;

  constructor(
    protected identifier: agentIdentifier,
    protected functionCallService: FunctionCallService,
    protected systemEventsService: SystemEventsService,
    protected agenteConfig?: AgentConfig,
  ) {
    if (!this.agenteConfig) return;
    this.assistantId = this.agenteConfig.agentId;
    if ('threadId' in this.agenteConfig) {
      this.threadId = this.agenteConfig.threadId ?? null;
    }
    if (this.agenteConfig.DBagentId) this.agentId = this.agenteConfig.DBagentId;
    this.organizationId = this.agenteConfig.organizationId ?? null;
  }

  public async initializeAgent(): Promise<void> {
    try {
      if (this.assistantId) return;
      await this._initializeAgent();
      await this.systemEventsService.logAgentEvent({
        agentId: this.agentId!,
        type: EventType.AGENT_INITIALIZED,
        organizationId: this.organizationId!,
      });
    } catch (error) {
      await this.systemEventsService.logAgentEvent({
        agentId: this.agentId!,
        type: EventType.AGENT_INITIALIZED,
        organizationId: this.organizationId!,
        error: error as Error,
      });
      throw error;
    }
  }

  public async getAudioText(audioName: string): Promise<any> {
    return this._getAudioText(audioName);
  }

  public async textToAudio(text: string): Promise<string> {
    return this._textToAudio(text);
  }

  public async updateAgent(config: CreateAgentConfig, assistantId: string): Promise<void> {
    return this._updateAgent(config, assistantId);
  }

  public async updateFunctions(funciones: Funcion[], assistantId: string, hasKnowledgeBase: boolean, hasHitl: boolean): Promise<void> {
    try {
      await this._updateFunctions(funciones, assistantId, hasKnowledgeBase, hasHitl);
      await this.systemEventsService.logAgentToolsUpdate({
        agentId: this.agentId!,
        organizationId: this.organizationId!,
        functions: funciones,
        hitl: hasHitl,
      });
    } catch (error) {
      await this.systemEventsService.logAgentToolsUpdate({
        agentId: this.agentId!,
        organizationId: this.organizationId!,
        functions: funciones,
        hitl: hasHitl,
        error: error as Error,
      });
      throw error;
    }
  }

  public static async createVectorStore(agentId: number): Promise<string> {
    throw new Error('Method not implemented');
  }

  public static async uploadFileToVectorStore(file: any, vectorStoreId: string): Promise<string> {
    throw new Error('Method not implemented');
  }

  public static async deleteFileFromVectorStore(fileId: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  public static async deleteVectorStore(vectorStoreId: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  public static async listVectorStoreFiles(vectorStoreId: string): Promise<string[]> {
    throw new Error('Method not implemented');
  }

  public static async updateAssistantToolResources(
    assistantId: string,
    vectorStoreId: string | null,
    updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean },
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  public getThreadId(): string | undefined {
    return this.threadId || undefined;
  }

  public getAgentId(): string {
    if (!this.assistantId) throw new Error('Assistant not initialized');
    return this.assistantId;
  }

  protected async validateResponse(response: string): Promise<string> {
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from agent');
    }
    return response.trim();
  }

  protected getContextualizedInstructions(): string {
    return '';
  }

  public async response(message: string, conversationId: number, images?: string[], userId?: number): Promise<string> {
    const startTime = Date.now();
    if (!this.agentId) throw new Error('Agent ID is required');
    try {
      if (!this.threadId) this.threadId = await this.createThread();
      await this.systemEventsService.logAgentEvent({
        agentId: this.agentId,
        type: EventType.AGENT_RESPONSE_STARTED,
        organizationId: this.organizationId!,
        conversationId,
      });
      const response = await this._response(message, conversationId, images, userId);
      await this.systemEventsService.logAgentResponse({
        agentId: this.agentId,
        message: response,
        organizationId: this.organizationId!,
        conversationId,
        responseTime: Date.now() - startTime,
      });
      return response;
    } catch (error) {
      await this.systemEventsService.logAgentResponse({
        agentId: this.agentId,
        message: message,
        organizationId: this.organizationId!,
        conversationId,
        responseTime: Date.now() - startTime,
        error: error as Error,
      });
      throw error;
    }
  }

  async init(): Promise<void> {
    await this._initializeAgent();
  }

  protected abstract _response(message: string, conversationId: number, images?: string[], userId?: number): Promise<string>;
  protected abstract _initializeAgent(): Promise<void>;
  protected abstract _createThread(): Promise<string>;
  protected abstract _addMessageToThread(message: string, images?: string[]): Promise<void>;
  protected abstract _runAgent(threadId: string, conversationId: number): Promise<boolean>;
  protected abstract _getResponse(): Promise<string>;
  protected abstract _getAudioText(audioName: string): Promise<any>;
  protected abstract _textToAudio(text: string): Promise<string>;
  protected abstract _updateAgent(config: CreateAgentConfig, assistantId: string): Promise<void>;
  protected abstract _updateFunctions(funciones: Funcion[], assistantId: string, hasKnowledgeBase: boolean, hasHitl: boolean): Promise<void>;

  protected async createThread(): Promise<string> {
    const threadId = await this._createThread();
    await this.systemEventsService.logAgentThreadEvent({
      agentId: this.agentId!,
      threadId,
      organizationId: this.organizationId!,
    });
    return threadId;
  }
}
