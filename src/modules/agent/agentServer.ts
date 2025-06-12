import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { HitlTypesService } from '@modules/hitl-types/hitl-types.service';
import { FileService } from '../file/file.service'; // Correct import path
import { InputType, VoyageService } from '../agent-knowledgebase/voyage.service'; // Correct import path
import { VectorStoreService } from '../agent-knowledgebase/vector-store.service'; // Correct import path

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
  fileIds?: string[];
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
    private readonly fileService: FileService, // Inject FileService
    private readonly voyageService: VoyageService, // Inject VoyageService
    private readonly vectorStoreService: VectorStoreService, // Inject VectorStoreService
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente>,
    @InjectRepository(Funcion)
    private readonly funcionRepository: Repository<Funcion>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly functionCallService: FunctionCallService,
    private readonly systemEventsService: SystemEventsService,
    private readonly integrationRouterService: IntegrationRouterService,
    private readonly hitlTypesService: HitlTypesService,
    private readonly configService: ConfigService,
  ) {
    this.agentServiceFactory = {
      [AgenteType.SOFIA_ASISTENTE]: (identifier, config) => {
        // Asegurar que DBagentId esté presente
        if (!config.DBagentId) {
          throw new Error('DBagentId debe estar definido cuando se crea SofiaLLMService');
        }
        return new SofiaLLMService(this.functionCallService, this.systemEventsService, this.integrationRouterService, this.hitlTypesService, identifier, config);
      },
      [AgenteType.CLAUDE]: (identifier, config) =>
        new ClaudeSonetService(this.functionCallService, this.systemEventsService, this.integrationRouterService, this.hitlTypesService, identifier, config, this.configService),
    };
  }

  /**
   * Obtiene la respuesta del agente
   * @param props mensaje a enviar al agente
   * @returns respuesta del agente
   */
  async getAgentResponse(props: getAgentResponseProps): Promise<AgentResponse | null> {
    const { message, identifier, agentId, conversationId, images, chatUserId, userId } = props;
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
      agenteConfig.threadId = (identifier as any).threatId;
    }

    if (!agenteConfig) {
      throw new Error('No se pudo obtener la configuracion del agente');
    }

    // Obtener el tipo de agente y sus bases de conocimiento
    const agent = await this.agenteRepository
      .createQueryBuilder('agent')
      .leftJoinAndSelect('agent.knowledgeBases', 'knowledgeBases')
      .leftJoinAndSelect('agent.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .where('agent.id = :agentId', { agentId })
      .getOne();

    if (!agent) {
      throw new Error(`Agente con ID ${agentId} no encontrado`);
    }

    const fileIds = agent.knowledgeBases?.map((kb) => kb.fileId) || [];

    const agentType = agent.type as AgenteType;
    if (agentType === AgenteType.CLAUDE) {
      // Obtener el organizationId desde el agente
      const organizationId = agent.departamento?.organizacion?.id;
      if (!organizationId) {
        console.warn(`No se pudo obtener organizationId para el agente ${agentId}`);
      }
      // Procesar archivos de knowledge base si existen
      if (fileIds.length > 0 && organizationId) {
        const contextInfo = await this.processKnowledgeBaseFiles(message, fileIds, organizationId, agentId);
        if (contextInfo) {
          // Guardar el contexto en agenteConfig para ser utilizado por Claude
          agenteConfig.instruccion = `${agenteConfig.instruccion}\n${contextInfo}`;
        }
      }
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
    // Consulta directa para obtener mensajes de la sesión activa en una sola operación
    const query = this.conversationRepository.manager
      .createQueryBuilder(Message, 'message')
      .leftJoinAndSelect('message.chatSession', 'session')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('session.closedAt IS NULL')
      .orderBy('message.created_at', 'ASC');

    const messages = await query.getMany();

    if (messages.length > 0) {
      baseConfig.messages = messages.slice(0, -1);
    }

    return baseConfig;
  }

  /**
   * Procesa archivos de knowledge base para obtener contenido relevante
   * @param message Mensaje del usuario
   * @param fileIds IDs de archivos de knowledge base
   * @param organizationId ID de la organización
   * @param agentId ID del agente
   * @returns Documentos relevantes encontrados
   */
  private async processKnowledgeBaseFiles(message: string, fileIds: string[], organizationId: number, agentId: number): Promise<string> {
    try {
      // Obtener embedding del mensaje
      const messageEmbedding = await this.voyageService.getEmbedding([message], InputType.Query);
      if (!messageEmbedding.length) {
        console.warn('No se pudo generar embedding para el mensaje del usuario');
        return '';
      }

      const queryEmbedding = messageEmbedding[0];
      // Filtrar archivos no existentes
      const existingFileIds = await this.vectorStoreService.getFileIdsByAgentId(agentId, fileIds);

      // Extraer texto y generar embeddings
      await this.extractTextAndGenerateEmbeddings(existingFileIds, organizationId, agentId);

      // Calcular similitud y ordenar documentos
      const allDocumentsSorted = await this.vectorStoreService.findSimilarDocumentsByAgentId(queryEmbedding, agentId);

      // Seleccionar documentos relevantes
      const top3Documents = allDocumentsSorted.slice(0, 3);

      // Construir contexto
      const context = top3Documents.map((doc, index) => `Documento ${index + 1}: ${doc.content}`).join('\n\n');

      // Mostrar documentos relevantes en consola
      if (top3Documents.length > 0) {
      }

      return context;
    } catch (error) {
      console.error('Error al generar embeddings o calcular similitud:', error);
      return '';
    }
  }

  /**
   * Extrae texto de archivos y genera embeddings para documentos
   * @param fileIds IDs de los archivos a procesar
   * @param organizationId ID de la organización
   * @param agentId ID del agente (opcional)
   * @returns Array con textos y embeddings generados
   */
  private async extractTextAndGenerateEmbeddings(
    fileIds: string[],
    organizationId: number,
    agentId?: number,
  ): Promise<{ documentEmbeddings: number[][]; documentTexts: string[] }> {
    const allParagraphs: string[] = [];
    const fileParaMap: Record<number, string> = {};
    let currentIndex = 0;

    const extractTextPromises = fileIds.map(async (fileId) => {
      const text = await this.fileService.findAndExtractText(`uploads/organizations/${organizationId}/files`, fileId);
      const paragraphs = this.fileService.splitTextIntoParagraphs(text);

      paragraphs.forEach((paragraph) => {
        allParagraphs.push(paragraph);
        fileParaMap[currentIndex++] = fileId;
      });
    });

    await Promise.all(extractTextPromises);

    const allEmbeddings = await this.voyageService.getEmbedding(allParagraphs, InputType.Document);

    // Guardar los documentos con sus embeddings en la base de datos si se proporciona un agentId
    if (agentId) {
      // Preparar todos los documentos, embeddings y fileIds para una sola llamada
      const allDocuments: string[] = [];
      const embeddingsToSave: number[][] = [];
      const allFileIds: string[] = [];
      const metadata: Record<string, any> = {};

      Object.entries(fileParaMap).forEach(([index, fileId]) => {
        const idx = Number(index);
        allDocuments.push(allParagraphs[idx]);
        embeddingsToSave.push(allEmbeddings[idx]);
        allFileIds.push(fileId);
        metadata[`${fileId}_${idx}`] = { fileId };
      });

      await this.vectorStoreService.saveDocumentsWithEmbeddings(allDocuments, embeddingsToSave, allFileIds, agentId, metadata);
    }

    return {
      documentEmbeddings: allEmbeddings,
      documentTexts: allParagraphs,
    };
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
