import { Injectable, BadRequestException } from '@nestjs/common';
import { Message, MessageType, MessageFormatType } from '../../models/Message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { agentIdentifier, AgentIdentifierType, AgenteType } from 'src/interfaces/agent';
import { SofiaLLMService } from '../../services/llm-agent/sofia-llm.service';
import { ClaudeSonetService } from '../../services/llm-agent/claude-sonet.service';
import { BaseAgent } from '../../services/llm-agent/base-agent';
import { Agente } from '@models/agent/Agente.entity';
import { Repository } from 'typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { Conversation } from '@models/Conversation.entity';
import { SofiaConversationConfig } from 'src/interfaces/conversation.interface';
import { FunctionCallService } from './function-call.service';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';

/*** puede venir con departamento_id o con threat_id uno de los dos es necesario */
interface AgentResponse {
  message: string;
  threadId?: string;
  agentId?: string;
}

interface getAgentResponseProps {
  message: string;
  identifier: agentIdentifier;
  agentId: number;
  conversationId: number;
  images: string[];
  userId?: number;
  chatUserId?: number;
}

interface AgentConfig {
  agentId: string;
  DBagentId?: number;
  threadId?: string;
  funciones: Funcion[];
  organizationId: number;
  instruccion: string;
  messages?: Message[];
}

// Factory para crear servicios de agente según su tipo
type AgentServiceFactory = {
  [key in AgenteType]: (identifier: agentIdentifier, config: AgentConfig) => BaseAgent;
};

const tempMessagesTestAgent = new Map<number, Message[] | undefined>();

/**
 * Funcion que setea la configuracion del agente
 * @param config configuracion del agente
 * @param name nombre del agente
 * @returns configuracion del agente
 */
function setStartAgentConfig(config: Record<string, any>, funciones: Funcion[], organizationId: number, agentId: number, instruccion: string): AgentConfig {
  if (!config.agentId) {
    throw new Error('No se pudo obtener una de las propiedades necesarias del agente: instruccion, agentId, threadId o name');
  }
  return {
    agentId: config.agentId,
    funciones,
    organizationId,
    DBagentId: agentId,
    instruccion,
  };
}

/**
 * Servicio que se encarga de obtener la respuesta del agente
 */
@Injectable()
export class AgentService {
  private readonly agentServiceFactory: AgentServiceFactory;

  /**
   * Constructor del servicio
   * @param agenteRepository repositorio de agentes
   */
  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente>,
    @InjectRepository(Funcion)
    private readonly funcionRepository: Repository<Funcion>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly functionCallService: FunctionCallService,
    private readonly systemEventsService: SystemEventsService,
    private readonly integrationRouterService: IntegrationRouterService,
  ) {
    this.agentServiceFactory = {
      [AgenteType.SOFIA_ASISTENTE]: (identifier, config) => {
        // Asegurar que DBagentId esté presente
        if (!config.DBagentId) {
          throw new Error('DBagentId debe estar definido cuando se crea SofiaLLMService');
        }
        return new SofiaLLMService(this.functionCallService, this.systemEventsService, this.integrationRouterService, identifier, config);
      },
      [AgenteType.CLAUDE]: (identifier, config) => new ClaudeSonetService(this.functionCallService, this.systemEventsService, this.integrationRouterService, identifier, config),
    };
  }

  /**
   * Obtiene la respuesta del agente
   * @param props mensaje a enviar al agente
   * @returns respuesta del agente
   */
  async getAgentResponse(props: getAgentResponseProps): Promise<AgentResponse | null> {
    const { message, identifier, agentId, conversationId, images, chatUserId, userId } = props;
    console.time('configure-agent');
    let agenteConfig: AgentConfig | null = null;
    if ([AgentIdentifierType.CHAT, AgentIdentifierType.CHAT_TEST, AgentIdentifierType.TEST].includes(identifier.type)) {
      const queryBuilder = this.agenteRepository
        .createQueryBuilder('agente')
        .select(['agente.config'])
        .leftJoin('agente.funciones', 'funciones')
        .addSelect(['funciones.name', 'funciones.description', 'funciones.type', 'funciones.config'])
        .leftJoinAndSelect('agente.departamento', 'departamento')
        .leftJoinAndSelect('departamento.organizacion', 'organizacion')
        .where('agente.id = :agentId', { agentId });
      const result = await queryBuilder.getOne();
      if (!result) throw new Error('No se pudo obtener la configuracion del agente');
      if (!result.departamento?.organizacion) throw new Error('No se pudo obtener la organizacion');
      agenteConfig = setStartAgentConfig(result.config, result.funciones, result.departamento.organizacion.id, agentId, (result.config.instruccion as string) ?? '');
    }

    if (!agenteConfig) {
      throw new Error('No se pudo obtener la configuracion del agente');
    }

    // Obtener el tipo de agente de la consulta
    const agentType = await this.getAgentType(agentId);
    if (agentType === AgenteType.CLAUDE) {
      if ([AgentIdentifierType.CHAT_TEST, AgentIdentifierType.TEST].includes(identifier.type)) {
        agenteConfig = await this.configureTestAgent(userId, message, images, identifier, agentId, agenteConfig);
      }
      agenteConfig = await this.configureClaudeAgent(conversationId, agenteConfig);
    }

    // Usar el factory para crear el servicio de agente según el tipo
    const createAgentService = this.agentServiceFactory[agentType];
    if (!createAgentService) {
      throw new BadRequestException(`Tipo de agente no soportado: ${agentType}`);
    }

    const llmService = createAgentService(identifier, agenteConfig);
    console.timeEnd('configure-agent');
    const response = await llmService.response(message, conversationId, images, chatUserId);
    if (response === '') return null;

    // Si es TEST, guardar la respuesta del agente también como Message
    if ([AgentIdentifierType.TEST, AgentIdentifierType.CHAT_TEST].includes(identifier.type) && userId) {
      const existingMessages = tempMessagesTestAgent.get(userId) || [];
      const agentResponseMsg = new Message();
      agentResponseMsg.text = response;
      agentResponseMsg.type = MessageType.AGENT;
      agentResponseMsg.format = MessageFormatType.TEXT;
      agentResponseMsg.images = images;
      agentResponseMsg.created_at = new Date();
      agentResponseMsg.updated_at = new Date();
      tempMessagesTestAgent.set(userId, [...existingMessages, agentResponseMsg]);
    }

    return { message: response, threadId: llmService.getThreadId(), agentId: llmService.getAgentId() };
  }

  /**
   * Configura un agente de prueba
   * @param userId ID del usuario
   * @param message Mensaje del usuario
   * @param images Imágenes adjuntas
   * @param identifier Identificador del agente
   * @param agentId ID del agente
   * @param baseConfig Configuración base del agente
   * @returns Configuración del agente
   */
  private async configureTestAgent(
    userId?: number,
    message?: string,
    images?: string[],
    identifier?: agentIdentifier,
    agentId?: number,
    baseConfig?: AgentConfig | null,
  ): Promise<AgentConfig> {
    if (!userId) throw new Error('No se pudo obtener el userId');
    if (!message || !identifier || !agentId) throw new Error('Faltan parámetros para configurar el agente de prueba');

    const existingMessages = tempMessagesTestAgent.get(userId) || [];
    const messageObj = new Message();
    messageObj.text = message;
    messageObj.type = MessageType.USER;
    messageObj.format = MessageFormatType.TEXT;
    messageObj.images = images || [];
    messageObj.created_at = new Date();
    messageObj.updated_at = new Date();
    tempMessagesTestAgent.set(userId, [...existingMessages, messageObj]);

    const functions = await this.funcionRepository.createQueryBuilder('funcion').where('funcion.agent_id = :agentId', { agentId }).getMany();

    return {
      agentId: (identifier.type === AgentIdentifierType.TEST ? identifier.LLMAgentId : '') ?? baseConfig?.agentId ?? '',
      DBagentId: agentId,
      messages: existingMessages,
      instruccion: baseConfig?.instruccion ?? '',
      threadId: identifier.type === AgentIdentifierType.TEST || identifier.type === AgentIdentifierType.THREAT ? (identifier as any).threatId : undefined,
      organizationId: baseConfig?.organizationId ?? 0,
      funciones: functions.map((f) => {
        f.name = f.normalizedName;
        return f;
      }),
    };
  }

  /**
   * Configura un agente Claude
   * @param conversationId ID de la conversación
   * @param baseConfig Configuración base del agente
   * @returns Configuración del agente
   */
  private async configureClaudeAgent(conversationId: number, baseConfig: AgentConfig): Promise<AgentConfig> {
    const dbConversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.messages', 'messages')
      .leftJoin('messages.chatSession', 'session')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    if (dbConversation?.messages) {
      baseConfig.messages = dbConversation.messages.slice(0, -1);
    }

    return baseConfig;
  }

  private async getAgentType(agentId: number): Promise<AgenteType> {
    const agent = await this.agenteRepository.findOne({
      where: { id: agentId },
      select: ['type'],
    });

    if (!agent) {
      throw new Error(`Agente con ID ${agentId} no encontrado`);
    }

    return agent.type as AgenteType;
  }

  async processMessageWithConversation(message: string, conversation: Conversation, images: string[], chatUserId?: number): Promise<AgentResponse | null> {
    let config = conversation.config as SofiaConversationConfig;
    let identifier = { type: AgentIdentifierType.CHAT } as agentIdentifier;
    const isConfigured = !!config;
    // Si no hay config, crear una configuración por defecto de tipo CHAT y obtener los IDs
    if (!isConfigured) {
      config = {
        type: AgenteType.SOFIA_ASISTENTE,
        agentIdentifier: {
          type: AgentIdentifierType.CHAT,
        },
      } as SofiaConversationConfig;
    } else {
      if (!config.agentIdentifier.agentId || !config.agentIdentifier.threatId) {
        throw new Error('No se pudo obtener el identificador del agente');
      }
      identifier = {
        agentId: config.agentIdentifier.agentId,
        type: AgentIdentifierType.CHAT,
        threatId: config.agentIdentifier.threatId,
        LLMAgentId: config.agentIdentifier.agentId,
        agent: config.type || AgenteType.SOFIA_ASISTENTE,
      } as agentIdentifier;
    }

    const response = await this.getAgentResponse({
      message,
      identifier,
      agentId: conversation.departamento.agente?.id,
      conversationId: conversation.id,
      images,
      chatUserId: chatUserId,
    });
    if (!response) return null;
    if (!isConfigured) {
      config.agentIdentifier.agentId = response.agentId;
      config.agentIdentifier.threatId = response.threadId;
      conversation.config = config;
      await this.conversationRepository.save(conversation);
    }
    return response;
  }
}
