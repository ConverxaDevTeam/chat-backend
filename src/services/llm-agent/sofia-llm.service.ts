import OpenAI from 'openai';
import { AgentConfig, agentIdentifier, CreateAgentConfig } from 'src/interfaces/agent';
import { FunctionType, HttpRequestConfig, FunctionParam, FunctionResponse } from 'src/interfaces/function.interface';
import { BaseAgent } from './base-agent';
import { FunctionCallService } from '../function-call.service';

// Funciones auxiliares para el manejo de herramientas
const createFunctionTool = (func: FunctionResponse) => ({
  type: 'function' as const,
  function: {
    name: func.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Reemplazar caracteres no permitidos con _
      .replace(/_{2,}/g, '_'), // Evitar múltiples guiones bajos seguidos
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
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall,
  agenteConfig: AgentConfig,
  functionCallService: FunctionCallService,
): Promise<{ tool_call_id: string; output: string }> => {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);

  // Find the function configuration
  const functionConfig = agenteConfig.funciones?.find((f) => f.name.replace(/\s+/g, '_') === functionName && f.type === FunctionType.API_ENDPOINT);

  if (!functionConfig) {
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({ error: `Function ${functionName} not found` }),
    };
  }

  try {
    const response = await functionCallService.executeFunctionCall(functionConfig.id, functionArgs);
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
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initializeAgent(): Promise<void> {
    if (this.assistantId) return;
    console.log('Initializing agent', this.agenteConfig);

    const config = this.agenteConfig as CreateAgentConfig;
    if (!config?.instruccion) {
      throw new Error('La configuración del agente debe incluir una instrucción no vacía');
    }
    const tools = buildToolsArray({ funciones: config?.funciones ?? [] });
    console.log('Creating assistant');
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

  protected async addMessageToThread(message: string): Promise<void> {
    console.log(this.threadId);
    if (!this.threadId) throw new Error('Thread not initialized');
    await this.openai.beta.threads.messages.create(this.threadId, {
      role: 'user',
      content: message,
    });
  }

  protected async runAgent(threadId: string): Promise<any> {
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
            const result = await handleToolCall(toolCall, this.agenteConfig as AgentConfig, this.functionCallService);
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

  async response(message: string): Promise<string> {
    if (!this.threadId) this.threadId = await this.createThread();
    console.log('Sending message:', this.threadId);
    await this.addMessageToThread(message);
    await this.runAgent(this.threadId!);
    const response = await this.getResponse();
    return this.validateResponse(response);
  }

  public getAgentId(): string {
    if (!this.assistantId) throw new Error('Assistant not initialized');
    return this.assistantId;
  }

  async updateAgent(config: CreateAgentConfig, assistantId: string): Promise<void> {
    if (!assistantId) throw new Error('No se ha inicializado el agente');
    console.log('Updating agent', config);
    const tools = buildToolsArray({ funciones: config.funciones ?? [] });

    await this.openai.beta.assistants.update(assistantId, {
      name: config.name.replace(/\s+/g, '_'),
      instructions: this.getContextualizedInstructions() + '\n' + config.instruccion,
      tools,
    });
  }

  async updateFunctions(funciones: FunctionResponse[], assistantId: string): Promise<void> {
    if (!assistantId) throw new Error('No se ha inicializado el agente');
    console.log('Updating functions', funciones);
    const tools = buildToolsArray({ funciones });
    await this.openai.beta.assistants.update(assistantId, {
      tools,
    });
  }
}
