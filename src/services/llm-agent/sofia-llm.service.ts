import OpenAI from 'openai';
import { AgentConfig, agentIdentifier, RunAgentConfig, StartAgentConfig } from 'src/interfaces/agent';
import { FunctionType, HttpRequestConfig, FunctionParam, HttpMethod, FunctionResponse } from 'src/interfaces/function.interface';
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
    if (!this.agenteConfig) throw new Error('No se pudo obtener la configuracion del agente');
    if ((this.agenteConfig as StartAgentConfig)?.instruccion) {
      const tools: OpenAI.Beta.Assistants.AssistantTool[] = [];

      // Add function calling capability
      const config = this.agenteConfig as StartAgentConfig;
      if (config.funciones && config.funciones.length > 0) {
        config.funciones.forEach((func) => {
          if (func.type !== FunctionType.API_ENDPOINT) {
            throw new Error(`Tipo de función no soportada: ${func.type}`);
          }
          const httpConfig = func.config as HttpRequestConfig;
          tools.push({
            type: 'function',
            function: {
              name: func.name.replace(' ', '_'),
              description: func.description,
              parameters: {
                type: 'object',
                properties:
                  httpConfig.requestBody?.reduce<Record<string, { type: string; description: string }>>(
                    (acc, param: FunctionParam) => ({
                      ...acc,
                      [param.name]: {
                        type: param.type,
                        description: param.description,
                      },
                    }),
                    {},
                  ) || {},
                required: httpConfig.requestBody?.map((param) => param.name) || [],
              },
            },
          });
        });
      }

      const assistant = await this.openai.beta.assistants.create({
        name: config.name,
        instructions: this.getContextualizedInstructions() + '\n' + config.instruccion,
        model: 'gpt-4o-mini',
        tools,
      });
      this.assistantId = assistant.id;
      this.threadId = await this.createThread();
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
        const toolOutputs: Array<{ tool_call_id: string; output: string }> = [];

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          // Find the function configuration
          const functionConfig = (this.agenteConfig as StartAgentConfig).funciones?.find((f) => f.name.replace(' ', '_') === functionName && f.type === FunctionType.API_ENDPOINT);

          if (functionConfig) {
            try {
              // Execute the API call based on the function configuration
              const response = await this.executeApiCall(functionConfig, functionArgs);
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(response),
              });
            } catch (error) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
              });
            }
          } else {
            console.warn('Function config not found for:', functionName);
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify({ error: `Function ${functionName} not found` }),
            });
          }
        }

        if (toolOutputs.length > 0) {
          await this.openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
        } else {
          console.error('No tool outputs to submit!');
          throw new Error('No tool outputs available for required function calls');
        }
      }

      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus);
        throw new Error('Assistant run failed');
      }
    }
  }

  private async executeApiCall(functionConfig: FunctionResponse, args: any) {
    const httpConfig = functionConfig.config as HttpRequestConfig;
    const { url, method } = httpConfig;

    if (!url) {
      throw new Error('URL is required for API endpoint function');
    }

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
        return JSON.stringify(errorResponse) || errorResponse;
      } catch (error) {
        throw new Error(`API call failed: ${response.statusText}`);
      }
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
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
