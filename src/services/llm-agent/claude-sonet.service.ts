import { Injectable } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';
import { BaseAgent } from './base-agent';
import { AgentConfig, agentIdentifier, CreateAgentConfig } from 'src/interfaces/agent';
import { Message, MessageType } from '@models/Message.entity';
import { FunctionCallService } from '@modules/agent/function-call.service';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';
import { Funcion } from '@models/agent/Function.entity';
import { ContentBlock } from '@anthropic-ai/sdk/resources';

const tempMemory = new Map<string, Date>();
const tempMemoryConversation = new Map<number, string>();

type MessageContent = Array<
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source:
        | {
            type: 'url';
            url: string;
          }
        | {
            type: 'base64';
            media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
            data: string;
          };
    }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }
  | {
      type: 'tool_use';
      id: string;
      name: string;
      input: Record<string, any>;
    }
>;

interface MessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent | ContentBlock[];
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
      output?: string;
    };
  }>;
}

@Injectable()
export class ClaudeSonetService extends BaseAgent {
  /**
   * Convierte los mensajes de la entidad Message a formato MessageParam
   * @param messages Mensajes de la base de datos
   * @returns Mensajes en formato MessageParam requerido por Anthropic
   */
  private convertMessagesToMessageParams(messages: Message[]): MessageParam[] {
    // Eliminar el último mensaje para evitar duplicados

    return messages.map((message) => {
      const role = message.type === MessageType.USER ? 'user' : 'assistant';

      // Crear el content según si tiene imágenes o no
      let content: string | MessageContent;

      if (message.images && message.images.length > 0) {
        content = [
          { type: 'text' as const, text: message.text || '' },
          ...message.images.map((img) => ({
            type: 'image' as const,
            source: {
              type: 'url' as const,
              url: img,
            },
          })),
        ];
      } else {
        content = message.text || '';
      }

      return {
        role,
        content,
      };
    });
  }
  private anthropic: Anthropic;
  protected threadId: string | null = null;
  private messages: MessageParam[] = [];
  private system: string = '';

  constructor(
    functionCallService: FunctionCallService,
    systemEventsService: SystemEventsService,
    integrationRouterService: IntegrationRouterService,
    identifier: agentIdentifier,
    agenteConfig: AgentConfig,
  ) {
    super(identifier, functionCallService, systemEventsService, integrationRouterService, agenteConfig);
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    const config = this.agenteConfig as CreateAgentConfig;
    if (!config?.instruccion) {
      throw new Error('La configuración del agente debe incluir una instrucción no vacía');
    }
    this.system = config.instruccion;
    if (config.messages) {
      this.messages = this.convertMessagesToMessageParams(config.messages);
    }
  }

  async _initializeAgent(): Promise<void> {
    return;
  }

  protected async _createThread(conversationId: number): Promise<string> {
    this.threadId = `thread_${conversationId}`;
    return this.threadId;
  }

  protected async _addMessageToThread(message: string, images?: string[]): Promise<void> {
    if (!this.threadId) throw new Error('Thread not initialized');

    const content: MessageContent = [];
    if (message) {
      content.push({ type: 'text', text: message });
    }
    if (images?.length) {
      content.push(
        ...images.map((img) => ({
          type: 'image' as const,
          source: {
            type: 'url' as const,
            url: img,
          },
        })),
      );
    }

    this.messages.push({
      role: 'user',
      content,
    });
  }

  protected async _runAgent(threadId: string, conversationId: number): Promise<boolean> {
    try {
      // Crear mensaje con el contenido actual de this.messages
      const messages = this.messages.map((msg) => {
        // Convertir 'system' a 'user' ya que Anthropic no soporta 'system'
        const role = msg.role === 'system' ? 'user' : (msg.role as 'user' | 'assistant');

        if (typeof msg.content === 'string') {
          return {
            role,
            content: msg.content,
          };
        } else if (Array.isArray(msg.content)) {
          // Manejo de contenido como array (MessageContent)
          return {
            role,
            content: msg.content,
          };
        } else {
          // Fallback para otros tipos de contenido
          return {
            role,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(msg.content),
              },
            ],
          };
        }
      });

      // Obtener herramientas configuradas para este agente
      const tools =
        this.agenteConfig?.funciones?.map((func) => {
          // Construir propiedades de schema
          const properties: Record<string, any> = {};

          const requestBody = func.config?.requestBody || [];
          if (Array.isArray(requestBody) && requestBody.length > 0) {
            for (const param of requestBody) {
              properties[param.name] = {
                type: param.type,
                description: param.description || '',
              };
            }
          }

          // Evitar objeto vacío para properties
          if (Object.keys(properties).length === 0) {
            properties['_empty'] = { type: 'string', description: 'No parameters' };
          }

          // Obtener parámetros requeridos
          const required: string[] = [];
          if (Array.isArray(requestBody) && requestBody.length > 0) {
            for (const param of requestBody) {
              if (param.required) {
                required.push(param.name);
              }
            }
          }

          // Formato correcto para tools según la API de Claude
          return {
            name: func.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
            description: func.description || '',
            input_schema: {
              type: 'object',
              properties: Object.fromEntries(Object.entries(properties).map(([key, value]) => [key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64), value])),
              required: required.length > 0 ? required : undefined,
            },
          };
        }) || [];
      const messagesObject = {
        messages: messages as any,
        system: this.system,
        tools: tools as any,
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1024,
      };

      const response = await this.anthropic.messages.create(messagesObject);

      // Verificar si hay contenido de herramientas en la respuesta
      const toolUses = response.content.filter(
        (block): block is { type: 'tool_use'; id: string; name: string; input: Record<string, any> } =>
          block.type === 'tool_use' && 'id' in block && 'name' in block && 'input' in block,
      );

      this.messages.push({
        role: 'assistant',
        content: response.content,
      });

      if (toolUses.length > 0) {
        // Procesar las llamadas a herramientas
        const results = await Promise.allSettled(
          toolUses.map((toolUse) => {
            // No es necesario parsear input ya que ya viene como objeto
            return this.functionCallService.executeFunctionCall(toolUse.name, this.agentId!, toolUse.input, conversationId);
          }),
        );
        console.log('tools results', JSON.stringify(results));

        // Crear un nuevo mensaje con los resultados de las herramientas
        const toolResultsContent: MessageContent = toolUses.map((toolUse, i) => {
          const result = results[i];
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result.status === 'fulfilled' ? JSON.stringify(result.value) : JSON.stringify({ error: String((result as PromiseRejectedResult).reason) }),
            is_error: result.status !== 'fulfilled',
          };
        });

        // Agregar el mensaje con los resultados de las herramientas
        this.messages.push({
          role: 'user',
          content: toolResultsContent,
        });

        // Continuar la conversación para obtener la respuesta final
        return this._runAgent(threadId, conversationId);
      }

      // No necesitamos guardar la respuesta final aquí, ya la guardamos arriba

      return true;
    } catch (error) {
      console.error('Error en _runAgent:', error);
      throw error;
    }
  }

  protected async _getResponse(): Promise<string> {
    const lastMessage = this.messages[this.messages.length - 1];
    if (lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    if (typeof lastMessage.content === 'string') {
      return lastMessage.content;
    }

    const textContent = lastMessage.content.find((item) => item.type === 'text');
    return textContent?.text ?? '';
  }

  protected async _response(message: string, conversationId: number, images?: string[], userId?: number): Promise<string> {
    const stateDate = new Date();
    tempMemoryConversation.set(userId ?? conversationId, this.threadId ?? '');
    tempMemory.set(this.threadId ?? '', stateDate);

    try {
      if (this._isExpiredExecution(stateDate, userId, conversationId)) {
        return '';
      }

      // Añadir el mensaje del usuario a la lista de mensajes
      if (message) {
        if (images && images.length > 0) {
          // Si hay imágenes, crear un mensaje con contenido mixto (texto e imágenes)
          const content: MessageContent = [
            { type: 'text' as const, text: message },
            ...images.map((img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/jpeg' as const, // Asumimos jpeg, ajustar según sea necesario
                data: img,
              },
            })),
          ];

          this.messages.push({
            role: 'user',
            content,
          });
        } else {
          // Si solo hay texto
          this.messages.push({
            role: 'user',
            content: message,
          });
        }
      }

      return await this._executeWithStateValidation(
        async () => {
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

  private _isExpiredExecution(stateDate: Date, userId: number | undefined, conversationId: number): boolean {
    return (stateDate && tempMemory.get(this.threadId ?? '') !== stateDate) || tempMemoryConversation.get(userId ?? conversationId) !== this.threadId;
  }

  private async _executeWithStateValidation<T>(fn: () => Promise<T>, stateDate: Date, userId: number | undefined, conversationId: number): Promise<T> {
    if (this._isExpiredExecution(stateDate, userId, conversationId)) {
      return '' as unknown as T;
    }
    return await fn();
  }

  public getAgentId(): string {
    return this.threadId || '';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _updateAgent(_config: CreateAgentConfig, _assistantId: string): Promise<void> {
    // Implementación temporal que lanza error
    throw new Error('Method not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async _updateFunctions(_funciones: Funcion[], _assistantId: string, _hasKnowledgeBase: boolean, _hasHitl: boolean): Promise<void> {
    // Implementación temporal que lanza error
    throw new Error('Method not implemented');
  }
}
