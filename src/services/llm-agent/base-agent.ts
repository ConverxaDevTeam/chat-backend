import { AgentConfig, agentIdentifier, CreateAgentConfig } from 'src/interfaces/agent';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { Funcion } from '@models/agent/Function.entity';

export abstract class BaseAgent {
  protected threadId: string | null = null;
  protected assistantId: string | null = null;
  protected agentId: number | null = null;

  constructor(
    protected identifier: agentIdentifier,
    protected functionCallService: FunctionCallService,
    protected agenteConfig?: AgentConfig,
  ) {
    this.assistantId = this.agenteConfig?.agentId ?? null;
    if (this.agenteConfig && 'threadId' in this.agenteConfig) {
      this.threadId = this.agenteConfig?.threadId ?? null;
    }
    if (this.agenteConfig?.DBagentId) this.agentId = this.agenteConfig.DBagentId;
  }

  public async initializeAgent(): Promise<void> {
    if (this.assistantId) return;
    return this._initializeAgent();
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
    return this._updateFunctions(funciones, assistantId, hasKnowledgeBase, hasHitl);
  }

  public async createVectorStore(agentId: number): Promise<string> {
    return this._createVectorStore(agentId);
  }

  public async uploadFileToVectorStore(file: any, vectorStoreId: string): Promise<string> {
    return this._uploadFileToVectorStore(file, vectorStoreId);
  }

  public async deleteFileFromVectorStore(fileId: string): Promise<void> {
    return this._deleteFileFromVectorStore(fileId);
  }

  public async deleteVectorStore(vectorStoreId: string): Promise<void> {
    return this._deleteVectorStore(vectorStoreId);
  }

  public async listVectorStoreFiles(vectorStoreId: string): Promise<string[]> {
    return this._listVectorStoreFiles(vectorStoreId);
  }

  public async updateAssistantToolResources(
    assistantId: string,
    vectorStoreId: string | null,
    updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean },
  ): Promise<void> {
    return this._updateAssistantToolResources(assistantId, vectorStoreId, updateToolFunction);
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
    if (!this.threadId) this.threadId = await this._createThread();
    return this._response(message, conversationId, images, userId);
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
  protected abstract _createVectorStore(agentId: number): Promise<string>;
  protected abstract _uploadFileToVectorStore(file: any, vectorStoreId: string): Promise<string>;
  protected abstract _deleteFileFromVectorStore(fileId: string): Promise<void>;
  protected abstract _deleteVectorStore(vectorStoreId: string): Promise<void>;
  protected abstract _listVectorStoreFiles(vectorStoreId: string): Promise<string[]>;
  protected abstract _updateAssistantToolResources(
    assistantId: string,
    vectorStoreId: string | null,
    updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean },
  ): Promise<void>;
}
