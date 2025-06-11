import { AgentConfig, agentIdentifier, CreateAgentConfig } from 'src/interfaces/agent';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { Funcion } from '@models/agent/Function.entity';
import { SystemEventsService } from '../../modules/system-events/system-events.service';
import { EventType } from '@models/SystemEvent.entity';
import { ConversationType } from '@models/Conversation.entity';
import { IntegrationRouterService } from '../../modules/integration-router/integration.router.service';

export abstract class BaseAgent {
  protected threadId: string | null = null;
  protected assistantId: string | null = null;
  protected agentId: number;
  protected organizationId: number | null = null;

  constructor(
    protected identifier: agentIdentifier,
    protected functionCallService: FunctionCallService,
    protected systemEventsService: SystemEventsService,
    protected integrationRouterService: IntegrationRouterService,
    protected agenteConfig?: AgentConfig,
  ) {
    if (!this.agenteConfig) return;
    this.assistantId = this.agenteConfig.agentId;
    if ('threadId' in this.agenteConfig) {
      this.threadId = this.agenteConfig.threadId ?? null;
    }
    if (!this.agenteConfig.DBagentId) throw new Error('DBagentId is not set');
    this.agentId = this.agenteConfig.DBagentId;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _getAudioText(_audioName: string): Promise<any> {
    throw new Error('Method not implemented');
  }

  public static async getAudioText(audioName: string): Promise<any> {
    return this._getAudioText(audioName);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _textToAudio(_text: string): Promise<string> {
    throw new Error('Method not implemented');
  }

  public static async textToAudio(text: string): Promise<string> {
    return this._textToAudio(text);
  }

  public static async createVectorStore(agentId: number, organizationId: number, systemEventsService: SystemEventsService): Promise<string> {
    try {
      const vectorStoreId = await this._createVectorStore(agentId);

      await systemEventsService.logAgentEvent({
        agentId,
        type: EventType.AGENT_VECTOR_STORE_CREATED,
        organizationId,
        metadata: { vectorStoreId },
      });

      return vectorStoreId;
    } catch (error) {
      await systemEventsService.logVectorStoreError({
        agentId,
        type: EventType.AGENT_VECTOR_STORE_ERROR,
        organizationId,
        error: error as Error,
      });

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _createVectorStore(_agentId: number): Promise<string> {
    throw new Error('Method not implemented');
  }

  public static async uploadFileToVectorStore(
    file: any,
    vectorStoreId: string,
    agentId: number,
    organizationId: number,
    systemEventsService: SystemEventsService,
  ): Promise<string> {
    try {
      const fileId = await this._uploadFileToVectorStore(file, vectorStoreId);

      await systemEventsService.logAgentFileEvent({
        agentId,
        type: EventType.AGENT_FILE_UPLOADED,
        fileId,
        organizationId,
      });

      return fileId;
    } catch (error) {
      await systemEventsService.logVectorStoreError({
        agentId,
        type: EventType.AGENT_FILE_UPLOAD_ERROR,
        vectorStoreId,
        organizationId,
        error: error as Error,
      });

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _uploadFileToVectorStore(_file: any, _vectorStoreId: string): Promise<string> {
    throw new Error('Method not implemented');
  }

  public static async deleteFileFromVectorStore(
    fileId: string,
    agentId: number,
    vectorStoreId: string,
    organizationId: number,
    systemEventsService: SystemEventsService,
  ): Promise<void> {
    try {
      await this._deleteFileFromVectorStore(fileId);

      await systemEventsService.logAgentFileEvent({
        agentId,
        type: EventType.AGENT_FILE_DELETED,
        fileId,
        organizationId,
      });
    } catch (error) {
      await systemEventsService.logVectorStoreError({
        agentId,
        type: EventType.AGENT_FILE_DELETE_ERROR,
        fileId,
        vectorStoreId,
        organizationId,
        error: error as Error,
      });

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _deleteFileFromVectorStore(_fileId: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  public static async deleteVectorStore(vectorStoreId: string, agentId: number, organizationId: number, systemEventsService: SystemEventsService): Promise<void> {
    try {
      await this._deleteVectorStore(vectorStoreId);

      await systemEventsService.logAgentVectorStoreEvent({
        agentId,
        type: EventType.AGENT_VECTOR_STORE_DELETED,
        vectorStoreId,
        organizationId,
      });
    } catch (error) {
      await systemEventsService.logVectorStoreError({
        agentId,
        type: EventType.AGENT_VECTOR_STORE_ERROR,
        vectorStoreId,
        organizationId,
        error: error as Error,
      });

      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _deleteVectorStore(_vectorStoreId: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _updateVectorStore(_vectorStoreId: string): Promise<any> {
    throw new Error('Method not implemented');
  }

  public static async listVectorStoreFiles(vectorStoreId: string): Promise<string[]> {
    return this._listVectorStoreFiles(vectorStoreId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected static async _listVectorStoreFiles(_vectorStoreId: string): Promise<string[]> {
    throw new Error('Method not implemented');
  }

  public static async updateAssistantToolResources(
    assistantId: string,
    vectorStoreId: string | null,
    updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean },
    agentId: number,
    organizationId: number,
    systemEventsService: SystemEventsService,
  ): Promise<void> {
    try {
      await this._updateAssistantToolResources(assistantId, vectorStoreId, updateToolFunction);

      await systemEventsService.logAgentToolsUpdate({
        agentId,
        organizationId,
        functions: updateToolFunction.funciones,
        hitl: updateToolFunction.hitl,
      });
    } catch (error) {
      await systemEventsService.logAgentToolsUpdate({
        agentId,
        organizationId,
        functions: updateToolFunction.funciones,
        hitl: updateToolFunction.hitl,
        error: error as Error,
      });

      throw error;
    }
  }

  protected static async _updateAssistantToolResources(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _assistantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _vectorStoreId: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean },
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

  public async response(message: string, conversationId: number, images?: string[], chatUserId?: number): Promise<string> {
    const startTime = Date.now();
    if (!this.agentId) throw new Error('Agent ID is required');
    try {
      if (!this.threadId) this.threadId = await this.createThread(conversationId);

      await this.systemEventsService.logAgentEvent({
        agentId: this.agentId,
        type: EventType.AGENT_RESPONSE_STARTED,
        organizationId: this.organizationId!,
        conversationId,
      });

      // Enviar evento al usuario si es chat web
      this.integrationRouterService.sendEventToUser(conversationId, EventType.AGENT_RESPONSE_STARTED, ConversationType.CHAT_WEB, chatUserId);

      await this.addMessageToThread(message, images);

      await this.systemEventsService.logAgentEvent({
        agentId: this.agentId,
        type: EventType.AGENT_MESSAGE_ADDED,
        organizationId: this.organizationId!,
        conversationId,
        metadata: { message },
      });

      const hadRun = await this.runAgent(this.threadId, conversationId);
      if (!hadRun) {
        throw new Error('Failed to run agent');
      }

      const response = await this.getResponse();
      const validatedResponse = await this.validateResponse(response);

      await this.systemEventsService.logAgentResponse({
        agentId: this.agentId,
        message: validatedResponse,
        organizationId: this.organizationId!,
        conversationId,
        responseTime: Date.now() - startTime,
      });

      // Enviar evento al usuario si es chat web
      this.integrationRouterService.sendEventToUser(conversationId, EventType.AGENT_RESPONSE_COMPLETED, ConversationType.CHAT_WEB, chatUserId);

      return validatedResponse;
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
  protected abstract _createThread(conversationId: number): Promise<string>;
  protected abstract _addMessageToThread(message: string, images?: string[]): Promise<void>;
  protected abstract _runAgent(threadId: string, conversationId: number): Promise<boolean>;
  protected abstract _getResponse(): Promise<string>;
  protected abstract _updateAgent(config: CreateAgentConfig, assistantId: string): Promise<void>;
  protected abstract _updateFunctions(funciones: Funcion[], assistantId: string, hasKnowledgeBase: boolean, hasHitl: boolean): Promise<void>;

  protected async addMessageToThread(message: string, images?: string[]): Promise<void> {
    return this._addMessageToThread(message, images);
  }

  protected async runAgent(threadId: string, conversationId: number): Promise<boolean> {
    return this._runAgent(threadId, conversationId);
  }

  protected async getResponse(): Promise<string> {
    return this._getResponse();
  }

  protected async createThread(conversationId: number): Promise<string> {
    const threadId = await this._createThread(conversationId);
    await this.systemEventsService.logAgentThreadEvent({
      agentId: this.agentId!,
      threadId,
      organizationId: this.organizationId!,
      conversationId,
    });
    return threadId;
  }
}
