import { Injectable, BadRequestException } from '@nestjs/common';
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
}

// Factory para crear servicios de agente según su tipo
type AgentServiceFactory = {
  [key in AgenteType]: (identifier: agentIdentifier, config: AgentConfig) => BaseAgent;
};

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
      [AgenteType.SOFIA_ASISTENTE]: (identifier, config) =>
        new SofiaLLMService(this.functionCallService, this.systemEventsService, this.integrationRouterService, identifier, config),
      [AgenteType.CLAUDE]: (identifier, config) => new ClaudeSonetService(this.functionCallService, this.systemEventsService, this.integrationRouterService, identifier, config),
    };
  }

  /**
   * Obtiene la respuesta del agente
   * @param props mensaje a enviar al agente
   * @returns respuesta del agente
   */
  async getAgentResponse(props: getAgentResponseProps): Promise<AgentResponse | null> {
    const { message, identifier, agentId, conversationId, images, chatUserId } = props;
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
      console.log('result', result.config);
      agenteConfig = setStartAgentConfig(result.config, result.funciones, result.departamento.organizacion.id, agentId, (result.config.instruccion as string) ?? '');
    }

    if (identifier.type === AgentIdentifierType.TEST) {
      const functions = await this.funcionRepository.createQueryBuilder('funcion').where('funcion.agent_id = :agentId', { agentId }).getMany();

      agenteConfig = {
        agentId: identifier.LLMAgentId ?? agenteConfig?.agentId,
        DBagentId: agentId,
        threadId: identifier.threatId,
        funciones: functions.map((f) => {
          f.name = f.normalizedName;
          return f;
        }),
      } as AgentConfig;
    }

    if (!agenteConfig) {
      throw new Error('No se pudo obtener la configuracion del agente');
    }
    console.log('Configurando agente...', agenteConfig, identifier);

    // Obtener el tipo de agente de la consulta
    const agentType = await this.getAgentType(agentId);

    // Usar el factory para crear el servicio de agente según el tipo
    const createAgentService = this.agentServiceFactory[agentType];
    if (!createAgentService) {
      throw new BadRequestException(`Tipo de agente no soportado: ${agentType}`);
    }

    const llmService = createAgentService(identifier, agenteConfig);
    console.timeEnd('configure-agent');
    const response = await llmService.response(message, conversationId, images, chatUserId);
    if (response === '') return null;
    return { message: response, threadId: llmService.getThreadId(), agentId: llmService.getAgentId() };
  }

  /**
   * Procesa un mensaje para una conversación específica
   * @param message mensaje a procesar
   * @param conversationId id de la conversación
   * @returns respuesta del agente
   */
  /**
   * Obtiene el tipo de agente por su ID
   * @param agentId ID del agente
   * @returns tipo de agente
   */
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
