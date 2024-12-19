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

// Funciones auxiliares para el manejo de herramientas
const createFunctionTool = (func: FunctionResponse) => ({
  type: 'function' as const,
  function: {
    name: `${UserFunctionPrefix}${func.name}`, // Evitar múltiples guiones bajos seguidos
    description: func.description,
    parameters: {
      type: 'object',
      properties:
        (func.config as HttpRequestConfig).requestBody?.reduce<Record<string, { type: string; description: string }>>(
          (acc, param: FunctionParam) => ({
            ...acc,
            [param.name]: {
              type: param.type,
              description: param.description,
            },
          }),
          {},
        ) || {},
      required: (func.config as HttpRequestConfig).requestBody?.filter((param) => param.required).map((param) => param.name) || [],
    },
  },
});

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
  private assistantId: string | null = null;
  private agentId: number | null = null;

  constructor(
    private readonly functionCallService: FunctionCallService,
    identifier: agentIdentifier,
    private readonly agenteConfig?: AgentConfig,
  ) {
    super(identifier);
    if (this.agenteConfig?.agentId) this.assistantId = this.agenteConfig.agentId;
    if (this.agenteConfig && 'threadId' in this.agenteConfig) {
      this.threadId = this.agenteConfig?.threadId ?? null;
    }
    if (this.agenteConfig?.DBagentId) this.agentId = this.agenteConfig.DBagentId;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initializeAgent(): Promise<void> {
    if (this.assistantId) return;

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
      model: 'gpt-4-1106-preview',
    });

    this.assistantId = assistant.id;
    return;
  }

  protected async createThread(): Promise<string> {
    const thread = await this.openai.beta.threads.create();
    this.threadId = thread.id;
    return thread.id;
  }

  protected async addMessageToThread(message: string, images?: string[]): Promise<void> {
    if (!this.threadId) throw new Error('Thread not initialized');
    const imagesContent =
      images?.map((image) => ({
        type: 'image_url' as const,
        image_url: {
          url: image,
        },
      })) ?? [];
    await this.openai.beta.threads.messages.create(this.threadId, {
      role: 'user',
      content: [
        {
          type: 'text',
          text: message,
        },
        ...imagesContent,
      ],
    });
  }

  protected async runAgent(threadId: string, conversationId: number): Promise<any> {
    const run = await this.openai.beta.threads.runs.create(threadId, { assistant_id: this.assistantId! });

    // Wait for the run to complete
    let runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await this.openai.beta.threads.runs.retrieve(threadId, run.id);

      // Handle function calls
      if (runStatus.status === 'requires_action' && runStatus.required_action?.type === 'submit_tool_outputs') {
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        console.log(`Processing ${toolCalls.length} tool calls`);

        const toolOutputs = await Promise.all(
          toolCalls.map(async (toolCall) => {
            console.log(`Processing tool call: ${toolCall.function.name}`);
            const result = await handleToolCall(this.agentId!, toolCall, this.functionCallService, conversationId);
            console.log(`Tool call result for ${toolCall.function.name}:`, result);
            return result;
          }),
        );

        if (toolOutputs.length > 0) {
          console.log('Submitting tool outputs:', toolOutputs);
          await this.openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
          console.log('Tool outputs submitted successfully');
        } else {
          console.error('No tool outputs to submit!');
          throw new Error('No tool outputs available for required function calls');
        }
      }

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

  async response(message: string, conversationId: number, images?: string[]): Promise<string> {
    if (!this.threadId) this.threadId = await this.createThread();
    console.log('Sending message:', this.threadId);
    await this.addMessageToThread(message, images);
    await this.runAgent(this.threadId!, conversationId);
    const response = await this.getResponse();
    return this.validateResponse(response);
  }

  public getAgentId(): string {
    if (!this.assistantId) throw new Error('Assistant not initialized');
    return this.assistantId;
  }

  async getAudioText(audioName: string) {
    const pathFileAudio = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', audioName);
    const transcription = await this.openai.audio.transcriptions.create({
      file: createReadStream(pathFileAudio),
      model: 'whisper-1',
    });

    return transcription;
  }

  async updateAgent(config: CreateAgentConfig, assistantId: string): Promise<void> {
    if (!assistantId) throw new Error('No se ha inicializado el agente');
    if (!config?.name) throw new Error('No se pudo obtener el nombre del agente');
    console.log('Actualizando agente...');
    const response = await this.openai.beta.assistants.update(assistantId, {
      name: config.name.replace(/\s+/g, '_'),
      instructions: this.getContextualizedInstructions() + '\n' + config.instruccion,
    });
    console.log('Actualización de agente exitosa:', response);
  }

  async updateFunctions(funciones: Funcion[], assistantId: string, hasKnowledgeBase: boolean, hasHitl: boolean): Promise<void> {
    const tools = buildToolsArray({ funciones: funciones.map((f) => ({ ...f, name: f.normalizedName })) });
    if (hasKnowledgeBase) tools.push({ type: 'file_search' });
    this.renderHITL(hasHitl, tools);
    await this.openai.beta.assistants.update(assistantId, {
      tools,
    });
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

  async createVectorStore(agentId: number): Promise<string> {
    try {
      const vectorStore = await this.openai.beta.vectorStores.create({
        name: `agent_${agentId}_knowledge`,
      });
      return vectorStore.id;
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  async uploadFileToVectorStore(file: Express.Multer.File, vectorStoreId: string): Promise<string> {
    if (!file?.buffer || !file?.originalname) {
      throw new Error('Invalid file upload: Missing buffer or filename');
    }

    let tempPath: string | null = null;

    try {
      // Create unique temp file name
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      tempPath = path.join(os.tmpdir(), `${uniqueSuffix}-${safeName}`);

      // Write buffer to temp file
      await fs.promises.writeFile(tempPath, file.buffer);

      // Upload to vector store
      await this.openai.beta.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
        files: [fs.createReadStream(tempPath)],
      });

      // Get file ID from vector store
      const files = await this.openai.beta.vectorStores.files.list(vectorStoreId);
      const vectorFile = files.data.sort((a, b) => b.created_at - a.created_at).find((f) => f.status === 'completed');

      if (!vectorFile) {
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

  async deleteFileFromVectorStore(fileId: string): Promise<void> {
    try {
      await this.openai.files.del(fileId);
      console.log('File deleted from vector store:', fileId);
    } catch (error) {
      console.error('Error deleting file from vector store:', error);
      throw error;
    }
  }

  async deleteVectorStore(vectorStoreId: string): Promise<void> {
    try {
      await this.openai.beta.vectorStores.del(vectorStoreId);
    } catch (error) {
      console.error('Error deleting vector store:', error);
      throw error;
    }
  }

  async listVectorStoreFiles(vectorStoreId: string): Promise<string[]> {
    try {
      const files = await this.openai.beta.vectorStores.files.list(vectorStoreId);
      return files.data.map((file) => file.id);
    } catch (error) {
      console.error('Error listing vector store files:', error);
      throw error;
    }
  }

  async updateAssistantToolResources(assistantId: string, vectorStoreId: string | null, updateToolFunction: { add: boolean; funciones: Funcion[]; hitl: boolean }) {
    try {
      const updateData: { tools?: OpenAI.Beta.Assistants.AssistantTool[]; tool_resources?: { file_search: { vector_store_ids: string[] } } } = {};

      updateData.tools = buildToolsArray({ funciones: updateToolFunction.funciones });
      this.renderHITL(updateToolFunction.hitl, updateData.tools);
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
      await this.openai.beta.assistants.update(assistantId, updateData);
    } catch (error) {
      console.error('Error updating assistant tool resources:', error);
      throw error;
    }
  }
}
