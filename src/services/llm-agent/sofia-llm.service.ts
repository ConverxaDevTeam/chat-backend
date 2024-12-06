import OpenAI from 'openai';
import { AgentConfig, agentIdentifier, RunAgentConfig, StartAgentConfig } from 'src/interfaces/agent';
import { FunctionType, HttpRequestConfig, FunctionParam, HttpMethod, FunctionResponse } from 'src/interfaces/function.interface';
import { BaseAgent } from './base-agent';

// Funciones auxiliares para el manejo de herramientas
const createFunctionTool = (func: FunctionResponse) => ({
  type: 'function' as const,
  function: {
    name: func.name.replace(/\s+/g, '_'),
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
      required: (func.config as HttpRequestConfig).requestBody?.map((param) => param.name) || [],
    },
  },
});

const buildToolsArray = (config: StartAgentConfig) => {
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

const makeApiCall = async (url: string, method: HttpMethod | undefined, args: any) => {
  console.log(`Making API call to ${url} with method ${method} and args ${JSON.stringify(args)}`);
  const response = await fetch(url, {
    method: method || HttpMethod.GET,
    headers: {
      'Content-Type': 'application/json',
    },
    body: method !== HttpMethod.GET ? JSON.stringify(args) : undefined,
  });

  if (!response.ok) {
    try {
      const errorResponse = await response.json();
      console.log(`API call failed with error: ${JSON.stringify(errorResponse)}`);
      return JSON.stringify(errorResponse) || errorResponse;
    } catch (error) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
  }

  return await response.json();
};

const handleToolCall = async (
  toolCall: OpenAI.Beta.Threads.Runs.RequiredActionFunctionToolCall,
  agenteConfig: StartAgentConfig,
): Promise<{ tool_call_id: string; output: string }> => {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  console.log(`Handling tool call for function: ${functionName}`);

  // Use either the stored functions or the ones from config
  const availableFunctions = agenteConfig.funciones;
  console.log(
    'Available functions:',
    availableFunctions?.map((f) => ({ name: f.name, normalized: f.name.replace(/\s+/g, '_') })),
  );

  // Find the function configuration
  const functionConfig = availableFunctions?.find((f) => f.name.replace(/\s+/g, '_') === functionName && f.type === FunctionType.API_ENDPOINT);

  if (!functionConfig) {
    console.log(`Function configuration not found for: ${functionName}`);
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({ error: `Function ${functionName} not found` }),
    };
  }

  console.log(`Found function configuration for ${functionName}:`, functionConfig);

  try {
    const httpConfig = functionConfig.config as HttpRequestConfig;
    if (!httpConfig.url) {
      throw new Error('URL is required for API endpoint function');
    }

    // Verificar y combinar los parámetros existentes con los nuevos
    const mergedArgs = { ...functionArgs };
    if (httpConfig.requestBody) {
      httpConfig.requestBody.forEach((param: FunctionParam) => {
        // Si el parámetro tiene un id predefinido, usarlo en lugar del valor proporcionado
        if (param.id && !mergedArgs[param.name]) {
          mergedArgs[param.name] = param.id;
        }
      });
    }

    const response = await makeApiCall(httpConfig.url, httpConfig.method, mergedArgs);
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify(response),
    };
  } catch (error) {
    return {
      tool_call_id: toolCall.id,
      output: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export class SofiaLLMService extends BaseAgent {
  private openai: OpenAI;
  private assistantId: string | null = null;
  private storedFunctions: FunctionResponse[] | undefined;

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
    if (this.assistantId) return;
    if (!this.agenteConfig) throw new Error('No se pudo obtener la configuracion del agente');
    if ((this.agenteConfig as StartAgentConfig)?.instruccion) {
      console.log('Creating assistant');
      const config = this.agenteConfig as StartAgentConfig;
      // Store the functions configuration for future use
      this.storedFunctions = config.funciones;
      const tools = buildToolsArray(config);

      const assistant = await this.openai.beta.assistants.create({
        name: config.name,
        instructions: this.getContextualizedInstructions() + '\n' + config.instruccion,
        model: 'gpt-4-1106-preview',
        tools,
      });
      this.assistantId = assistant.id;
      this.threadId = await this.createThread();
      console.log('Assistant created successfully');
      return;
    }
    if (!(this.agenteConfig as RunAgentConfig)?.threadId) throw new Error('No se pudo obtener la configuracion del agente');
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
            const result = await handleToolCall(toolCall, this.agenteConfig as StartAgentConfig);
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
    console.log('Getting assistant response');
    const messages = await this.openai.beta.threads.messages.list(this.threadId);
    console.log('Got assistant response');
    const lastMessage = messages.data[0];

    if (lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    return lastMessage.content[0].type === 'text' ? lastMessage.content[0].text.value : '';
  }

  async response(message: string): Promise<string> {
    await this.initializeAgent();
    await this.addMessageToThread(message);
    await this.runAgent(this.threadId!);
    const response = await this.getResponse();
    return this.validateResponse(response);
  }

  public getAgentId(): string {
    if (!this.assistantId) throw new Error('Assistant not initialized');
    return this.assistantId;
  }
}
