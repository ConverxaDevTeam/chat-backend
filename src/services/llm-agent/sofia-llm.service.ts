import OpenAI from 'openai';
import { AgentConfig, agentIdentifier, CreateAgentConfig, HitlName, UserFunctionPrefix } from 'src/interfaces/agent';
import { FunctionType, HttpRequestConfig, FunctionParam, FunctionResponse } from 'src/interfaces/function.interface';
import { BaseAgent } from './base-agent';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Funcion } from '@models/agent/Function.entity';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as uuid from 'uuid';
import { MessageContentPartParam } from 'openai/resources/beta/threads/messages';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';

const tempMemory = new Map();
const tempMemoryConversation = new Map();

// Funciones auxiliares para el manejo de herramientas
const createFunctionTool = (func: FunctionResponse) => {
  const buildParameterProperties = (params: FunctionParam[]): Record<string, any> => {
    return params.reduce<Record<string, any>>((acc, param) => {
      const paramDef: Record<string, any> = {
        type: param.type,
        description: param.description || '',
      };

      // Si es un objeto y tiene propiedades anidadas
      if (param.type === 'object' && param.properties && param.properties.length > 0) {
        paramDef.properties = buildParameterProperties(param.properties);

        // Agregar required para las propiedades anidadas
        const requiredProps = param.properties.filter((prop) => prop.required).map((prop) => prop.name);

        if (requiredProps.length > 0) {
          paramDef.required = requiredProps;
        }
      }

      return {
        ...acc,
        [param.name]: paramDef,
      };
    }, {});
  };

  const requestBody = (func.config as HttpRequestConfig).requestBody || [];
  const properties = buildParameterProperties(requestBody);
  const required = requestBody.filter((param) => param.required).map((param) => param.name);
  // Sanitizar el nombre de la función para cumplir con el patrón requerido por OpenAI
  const sanitizedName = `${UserFunctionPrefix}${func.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return {
    type: 'function' as const,
    function: {
      name: sanitizedName,
      description: func.description,
      parameters: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
    },
  };
};

const buildToolsArray = (config: { funciones: FunctionResponse[] }) => {
  const tools: OpenAI.Beta.Assistants.AssistantTool[] = [];
  if (config.funciones && config.funciones.length > 0) {
    config.funciones.forEach((func) => {
      if (func.type === FunctionType.API_ENDPOINT) {
        tools.push(createFunctionTool(func));
      }
    });
  }
  return tools;
};

const handleToolCall = async (
  agentId: number,
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall,
  functionCallService: FunctionCallService,
  conversationId: number,
): Promise<{ tool_call_id: string; output: string }> => {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  try {
    const response = await functionCallService.executeFunctionCall(functionName, agentId, functionArgs, conversationId);
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(response),
    };
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error);
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export class SofiaLLMService extends BaseAgent {
  private openai: OpenAI;

  constructor(
    functionCallService: FunctionCallService,
    systemEventsService: SystemEventsService,
    integrationRouterService: IntegrationRouterService,
    identifier: agentIdentifier,
    agenteConfig: AgentConfig,
  ) {
    super(identifier, functionCallService, systemEventsService, integrationRouterService, agenteConfig);
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async _initializeAgent(): Promise<void> {
    const config = this.agenteConfig as CreateAgentConfig;
    if (!config?.instruccion) {
      throw new Error('La configuración del agente debe incluir una instrucción no vacía');
    }
    const tools = buildToolsArray({ funciones: config?.funciones ?? [] });
    this.renderHITL(true, tools);
    const assistant = await this.openai.beta.assistants.create({
      name: config.name || 'Sofia Assistant',
      instructions: config.instruccion,
      tools,
      model: 'gpt-4o-mini',
    });

    this.assistantId = assistant.id;
    return;
  }

  protected async _createThread(conversationId: number): Promise<string> {
    const thread = await this.openai.beta.threads.create({
      metadata: {
        conversation_id: conversationId.toString(),
      },
    });
    return thread.id;
  }

  private extractRunId(message: string): string | null {
    console.log('Extracting run id from message:', message);
    try {
      const match = message.match(/run_([\w]+)/);
      return match ? `run_${match[1]}` : null;
    } catch {
      return null;
    }
  }

  private async cancelRun(errorMessage: string) {
    const runId = this.extractRunId(errorMessage);
    console.log('Run id:', runId);
    if (runId) {
      try {
        let runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId!, runId);
        const INCOMPLETE_STATUS = ['queued', 'cancelling', 'cancelled'];
        while (INCOMPLETE_STATUS.includes(runStatus.status)) {
          console.log(`before canceling Run status: ${runStatus.status}`);
          await new Promise((resolve) => setTimeout(resolve, 200));
          runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId!, runId);
        }
        console.log('actual Run status:', runStatus.status);
        await this.openai.beta.threads.runs.cancel(this.threadId!, runId);
        console.log('Run canceled:');
        runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId!, runId);
        while (!INCOMPLETE_STATUS.includes(runStatus.status)) {
          console.log(`on canceling Run status: ${runStatus.status}`);
          await new Promise((resolve) => setTimeout(resolve, 200));
          runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId!, runId);
        }
      } catch (error) {
        console.log('error on cancel run before completed', error.error.message);
        if (error.error.message === "Cannot cancel run with status 'completed'.") return;
        if (error.error.message === "Cannot cancel run with status 'cancelled'.") return;
        if (error.error.message === "Cannot cancel run with status 'cancelling'.") {
          let runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId!, runId);
          while (runStatus.status !== 'cancelled') {
            console.log(`on canceling after error Run status: ${runStatus.status}`);
            await new Promise((resolve) => setTimeout(resolve, 200));
            runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId!, runId);
          }
          return;
        }
        console.log('final error on cancel run', error);
        throw error;
      }
    }
  }

  protected async _addMessageToThread(message: string, images?: string[]): Promise<void> {
    if (!this.threadId) throw new Error('Thread not initialized');
    const imagesContent =
      images?.map((image) => ({
        type: 'image_url' as const,
        image_url: {
          url: image,
        },
      })) ?? [];
    const content: MessageContentPartParam[] = [];
    if (message) {
      content.push({
        type: 'text',
        text: message,
      });
    }
    content.push(...imagesContent);
    try {
      await this.openai.beta.threads.messages.create(this.threadId, {
        role: 'user',
        content,
      });
    } catch (error) {
      console.log('on add message to thread error');
      await this.cancelRun(error.error.message);
      try {
        await this.openai.beta.threads.messages.create(this.threadId, {
          role: 'user',
          content,
        });
        return;
      } catch (cancelError) {
        console.error('Error adding extra thread', cancelError);
        throw cancelError;
      }
    }
  }

  protected async _runAgent(threadId: string, conversationId: number): Promise<boolean> {
    console.time('total-run-time');
    console.time('create-run');
    let run: any;
    try {
      run = await this.openai.beta.threads.runs.create(threadId, { assistant_id: this.assistantId! });
    } catch (error) {
      await this.cancelRun(error.error.message);
      try {
        run = await this.openai.beta.threads.runs.create(threadId, { assistant_id: this.assistantId! });
      } catch (cancelError) {
        console.error('Error creating second run', cancelError);
        throw cancelError;
      }
    }
    console.timeEnd('create-run');

    // Wait for the run to complete
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    const INCOMPLETE_STATUS = ['completed', 'cancelling', 'cancelled'];
    while (!INCOMPLETE_STATUS.includes(runStatus.status)) {
      console.time('status-check');
      await new Promise((resolve) => setTimeout(resolve, 200));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
      console.log(`Run status: ${runStatus.status}`);
      console.timeEnd('status-check');

      // Handle function calls
      if (runStatus.status === 'requires_action' && runStatus.required_action?.type === 'submit_tool_outputs') {
        console.time('tool-calls-processing');
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        console.log(`Processing ${toolCalls.length} tool calls`);

        const toolOutputs = await Promise.all(
          toolCalls.map(async (toolCall) => {
            console.time(`tool-call-${toolCall.function.name}`);
            console.log(`Processing tool call: ${toolCall.function.name}`);
            const result = await handleToolCall(this.agentId!, toolCall, this.functionCallService, conversationId);
            console.timeEnd(`tool-call-${toolCall.function.name}`);
            console.log(`Tool call result for ${toolCall.function.name}:`);
            return result;
          }),
        );

        if (toolOutputs.length > 0) {
          console.time('submit-outputs');
          console.log('Submitting tool outputs:', toolOutputs);
          try {
            await this.openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
          } catch (error) {
            console.error('Error submitting tool outputs', error);
            throw error;
          }
          console.timeEnd('submit-outputs');
          console.log('Tool outputs submitted successfully');
        } else {
          console.error('No tool outputs to submit!');
          throw new Error('No tool outputs available for required function calls');
        }
        console.timeEnd('tool-calls-processing');
      }

      if (runStatus.status === 'failed') {
        console.error('Assistant run failed', runStatus);
        throw new Error('Assistant run failed');
      }
    }
    console.timeEnd('total-run-time');
    return true;
  }

  protected async _getResponse(): Promise<string> {
    if (!this.threadId) throw new Error('Thread not initialized');
    const messages = await this.openai.beta.threads.messages.list(this.threadId);
    const lastMessage = messages.data[0];

    if (lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    return lastMessage.content[0].type === 'text' ? lastMessage.content[0].text.value : '';
  }

  protected async _response(message: string, conversationId: number, images?: string[], userId?: number): Promise<string> {
    const stateDate = new Date();
    console.log('old execution before response', conversationId, this.threadId);
    tempMemoryConversation.set(userId ?? conversationId, this.threadId);
    tempMemory.set(this.threadId, stateDate);

    try {
      // Verificar si la ejecución es antigua antes de cada paso
      if (this._isExpiredExecution(stateDate, userId, conversationId)) {
        return '';
      }

      return await this._executeWithStateValidation(
        async () => {
          // Lógica específica de OpenAI que no puede ir en la clase base
          const start = performance.now();
          console.log(`Total time: ${((performance.now() - start) / 1000).toFixed(2)}s`);
          return '';
        },
        stateDate,
        userId,
        conversationId,
      );
    } catch (error) {
      console.error('Error in response:', error);
      throw error;
    }
  }

  /**
   * Verifica si la ejecución actual está expirada
   */
  private _isExpiredExecution(stateDate: Date, userId: number | undefined, conversationId: number): boolean {
    if (stateDate && tempMemory.get(this.threadId) !== stateDate) {
      console.log('old execution detected');
      return true;
    }

    if (tempMemoryConversation.get(userId ?? conversationId) !== this.threadId) {
      console.log('old conversation execution detected');
      return true;
    }

    return false;
  }

  /**
   * Ejecuta una función con validación de estado
   */
  private async _executeWithStateValidation<T>(fn: () => Promise<T>, stateDate: Date, userId: number | undefined, conversationId: number): Promise<T> {
    if (this._isExpiredExecution(stateDate, userId, conversationId)) {
      return '' as unknown as T;
    }

    return await fn();
  }

  public getAgentId(): string {
    if (!this.assistantId) throw new Error('Assistant not initialized');
    return this.assistantId;
  }

  protected static async _getAudioText(audioName: string) {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const pathFileAudio = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', audioName);
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(pathFileAudio),
        model: 'whisper-1',
      });

      return transcription;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  protected static async _textToAudio(text: string): Promise<string> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const audioId = uuid.v4();
      const pathFileAudio = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', `${audioId}.mp3`);
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(pathFileAudio, buffer);
      return `${audioId}.mp3`;
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }

  protected async _updateAgent(config: CreateAgentConfig, assistantId: string): Promise<void> {
    if (!assistantId) throw new Error('No se ha inicializado el agente');
    if (!config?.name) throw new Error('No se pudo obtener el nombre del agente');
    console.log('Actualizando agente...');
    const response = await this.openai.beta.assistants.update(assistantId, {
      name: config.name.replace(/\s+/g, '_'),
      instructions: this.getContextualizedInstructions() + '\n' + config.instruccion,
    });
    console.log('Actualización de agente exitosa:', response);
  }

  protected async _updateFunctions(funciones: Funcion[], assistantId: string, hasKnowledgeBase: boolean, hasHitl: boolean): Promise<void> {
    const tools = buildToolsArray({ funciones: funciones.map((f) => ({ ...f, name: f.normalizedName })) });
    if (hasKnowledgeBase) tools.push({ type: 'file_search' });
    this.renderHITL(hasHitl, tools);
    try {
      await this.openai.beta.assistants.update(assistantId, {
        tools,
      });
    } catch (error) {
      console.error('Error updating functions:', error);
      throw error;
    }
  }

  private renderHITL(hasHitl: boolean, tools: OpenAI.Beta.Assistants.AssistantTool[]) {
    if (hasHitl)
      tools.push({
        type: 'function',
        function: {
          name: HitlName,
          description: 'envia la conversacion a una persona',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      });
  }

  public static async createVectorStore(agentId: number): Promise<string> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const vectorStore = await openai.beta.vectorStores.create({
        name: `agent_${agentId}_knowledge`,
      });
      return vectorStore.id;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  public static async uploadFileToVectorStore(file: Express.Multer.File, vectorStoreId: string): Promise<string> {
    if (!file?.buffer || !file?.originalname) {
      throw new Error('Invalid file upload: Missing buffer or filename');
    }

    let tempPath: string | null = null;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    try {
      // Verificar si el vector store existe antes de intentar subir el archivo
      try {
        await openai.beta.vectorStores.retrieve(vectorStoreId);
      } catch (error) {
        console.error(`Vector store ${vectorStoreId} no existe, creando uno nuevo`);
        const newVectorStore = await openai.beta.vectorStores.create({
          name: `agent_knowledge_${Date.now()}`,
        });
        vectorStoreId = newVectorStore.id;
      }

      // Create unique temp file name
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      tempPath = path.join(os.tmpdir(), `${uniqueSuffix}-${safeName}`);

      // Write buffer to temp file
      await fs.promises.writeFile(tempPath, file.buffer);

      // Upload to vector store
      const fileStream = fs.createReadStream(tempPath);
      await openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
        files: [fileStream],
      });

      // Get file ID from vector store
      const filesResponse = await openai.beta.vectorStores.files.list(vectorStoreId);

      // Sort by creation date (newest first) and find first completed file
      const vectorFile = filesResponse.data.sort((a, b) => b.created_at - a.created_at).find((f) => f.status === 'completed');

      if (!vectorFile) {
        const errors = filesResponse.data.filter((f) => f.status === 'failed').map((f) => f.last_error);

        console.error('File upload completed but vector store processing failed', errors);
        throw new Error('File upload completed but vector store processing failed');
      }

      return vectorFile.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Vector store upload failed: ${errorMessage}`);
    } finally {
      // Clean up temp file if it exists
      if (tempPath) {
        await fs.promises.unlink(tempPath).catch((err) => {
          console.error(`Failed to clean up temp file ${tempPath}:`, err);
        });
      }
    }
  }

  public static async deleteFileFromVectorStore(fileId: string): Promise<void> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      await openai.files.del(fileId);
      console.log('File deleted from vector store:', fileId);
    } catch (error) {
      console.error('Error deleting file from vector store:', error);
      throw error;
    }
  }

  public static async deleteVectorStore(vectorStoreId: string): Promise<void> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      await openai.beta.vectorStores.del(vectorStoreId);
    } catch (error) {
      console.error('Error deleting vector store:', error);
      throw error;
    }
  }

  public static async listVectorStoreFiles(vectorStoreId: string): Promise<string[]> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const files = await openai.beta.vectorStores.files.list(vectorStoreId);
      return files.data.map((file) => file.id);
    } catch (error) {
      console.error('Error listing vector store files:', error);
      throw error;
    }
  }

  public static async updateAssistantToolResources(
    assistantId: string,
    vectorStoreId: string | null,
    updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean },
  ): Promise<void> {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const updateData: { tools?: OpenAI.Beta.Assistants.AssistantTool[]; tool_resources?: { file_search: { vector_store_ids: string[] } } } = {};

      // Validar y sanitizar nombres de funciones
      const sanitizedFunctions = updateToolFunction.funciones.map((func) => ({
        ...func,
        name: func.name.replace(/[^a-zA-Z0-9_-]/g, '_'),
      }));

      updateData.tools = buildToolsArray({ funciones: sanitizedFunctions });

      // Render HITL
      if (updateToolFunction.hitl) {
        updateData.tools.push({
          type: 'function',
          function: {
            name: HitlName,
            description: 'envia la conversacion a una persona',
            parameters: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        });
      }

      if (updateToolFunction.add) {
        updateData.tools.push({ type: 'file_search' });
      }

      if (vectorStoreId) {
        updateData.tool_resources = {
          file_search: {
            vector_store_ids: [vectorStoreId],
          },
        };
      }
      await openai.beta.assistants.update(assistantId, updateData);
    } catch (error) {
      console.error('Error updating assistant tool resources:', error);
      throw error;
    }
  }
}
