import { forwardRef, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from '../../modules/llm-agent/dto/CreateAgent.dto';
import { AgenteType, AgentIdentifierType, ChatAgentIdentifier, CreateAgentConfig, ConverxaLLMConfig } from 'src/interfaces/agent';
import { SocketService } from '@modules/socket/socket.service';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { Departamento } from '@models/Departamento.entity';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { Funcion } from '@models/agent/Function.entity';
import { ConverxaLLMService } from 'src/services/llm-agent/converxa-llm.service';
import { ClaudeSonetService } from 'src/services/llm-agent/claude-sonet.service';
import { BaseAgent } from 'src/services/llm-agent/base-agent';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';
import { HitlTypesService } from '@modules/hitl-types/hitl-types.service';
import { HitlEventType, HitlEvent } from 'src/interfaces/hitl-events';

// Tipos para las configuraciones de agentes
type ConverxaAgente = Agente<ConverxaLLMConfig>;

// Factory para crear servicios de agente según su tipo
type AgentServiceFactory = {
  [key in AgenteType]: (identifier: ChatAgentIdentifier, config: CreateAgentConfig) => BaseAgent;
};

@Injectable()
export class AgentManagerService {
  private readonly agentServiceFactory: AgentServiceFactory;

  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente<ConverxaLLMConfig>>,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly functionCallService: FunctionCallService,
    private readonly systemEventsService: SystemEventsService,
    private readonly integrationRouterService: IntegrationRouterService,
    private readonly hitlTypesService: HitlTypesService,
    private readonly configService: ConfigService,
  ) {
    this.agentServiceFactory = {
      [AgenteType.CONVERXA_ASISTENTE]: (identifier, config) => {
        // Validar que DBagentId esté presente
        if (!config.DBagentId) {
          throw new Error('DBagentId debe estar definido cuando se crea ConverxaLLMService');
        }
        return new ConverxaLLMService(this.functionCallService, this.systemEventsService, this.integrationRouterService, this.hitlTypesService, identifier, config);
      },
      [AgenteType.CLAUDE]: (identifier, config) =>
        new ClaudeSonetService(this.functionCallService, this.systemEventsService, this.integrationRouterService, this.hitlTypesService, identifier, config, this.configService),
    };
  }

  private buildAgentConfig(agente: ConverxaAgente, organizationId: number, organizationName: string): CreateAgentConfig {
    if (!agente.config?.instruccion) {
      throw new Error('La configuración del agente debe incluir una instrucción no vacía');
    }
    return {
      name: `converxa_${agente.departamento.id}_${agente.name}`,
      instruccion: agente.config.instruccion,
      agentId: agente.config.agentId ?? '',
      DBagentId: agente.id,
      organizationId,
      organizationName,
    };
  }

  async getAgentById(id: number): Promise<Agente> {
    const agente = await this.agenteRepository.findOne({
      where: { id },
      relations: ['funciones', 'departamento', 'departamento.organizacion'],
    });

    if (!agente) {
      throw new NotFoundException(`Agente con ID ${id} no encontrado`);
    }

    return agente;
  }

  async createAgent(createAgentDto: CreateAgentDto): Promise<Agente> {
    const { config, departamento_id, ...rest } = createAgentDto;

    // Convertir el DTO a un objeto plano
    const plainConfig = config ? { ...config } : undefined;
    const agente = await this.agenteRepository.save({
      ...rest,
      type: createAgentDto.type as AgenteType.CONVERXA_ASISTENTE,
      config: plainConfig,
      departamento: departamento_id ? ({ id: departamento_id } as Partial<Departamento>) : undefined,
    });

    // Inicializar la configuración según el tipo de agente
    switch (agente.type) {
      case AgenteType.CONVERXA_ASISTENTE: {
        const converxaConfig: ConverxaLLMConfig = {
          type: AgenteType.CONVERXA_ASISTENTE,
          config: {
            instruccion: createAgentDto.config?.instruccion || '',
          },
        };
        agente.config = converxaConfig.config;
        break;
      }
    }

    // Cargar el agente con relaciones para obtener datos de la organización
    if (departamento_id) {
      const fullAgente = await this.agenteRepository.findOne({
        where: { id: agente.id },
        relations: ['departamento', 'departamento.organizacion'],
      });
      if (fullAgente) {
        agente.departamento = fullAgente.departamento;
      }
    }

    // Inicializar el agente según su tipo
    const converxaAgent = agente as Agente<ConverxaLLMConfig>;
    console.log('on create agent', converxaAgent);
    const converxaConfig = this.buildAgentConfig(converxaAgent, createAgentDto.organization_id, agente.departamento?.organizacion?.name || 'DefaultOrg');
    const identifier: ChatAgentIdentifier = {
      type: AgentIdentifierType.CHAT,
      agentId: converxaConfig.agentId,
    };

    // Usar el factory para crear el servicio de agente según el tipo
    const createAgentService = this.agentServiceFactory[agente.type];
    if (!createAgentService) {
      throw new BadRequestException(`Tipo de agente no soportado: ${agente.type}`);
    }

    const llmService = createAgentService(identifier, converxaConfig);
    await llmService.init();
    converxaAgent.config.agentId = llmService.getAgentId();

    // Guardar el ID del asistente
    const savedAgente = await this.agenteRepository.save(converxaAgent);
    const agenteWithRelations = await this.agenteRepository.findOne({
      where: { id: savedAgente.id },
      relations: ['funciones', 'departamento', 'departamento.organizacion'],
    });

    if (!agenteWithRelations) {
      throw new NotFoundException(`Agente con ID ${savedAgente.id} no encontrado`);
    }

    if (!agenteWithRelations.departamento?.organizacion) {
      throw new BadRequestException('Agente sin organización asignada');
    }
    return agenteWithRelations;
  }

  async updateAgent(id: number, updateAgentDto: Partial<CreateAgentDto>, userId: number): Promise<Agente> {
    const { config, departamento_id, ...rest } = updateAgentDto;

    // Convertir el DTO a un objeto plano
    const plainConfig = config ? { ...config } : undefined;

    const updateData: DeepPartial<Agente> = {
      ...rest,
      config: plainConfig,
    };

    if (departamento_id) {
      updateData.departamento = { id: departamento_id } as Partial<Departamento>;
    }

    const agente = await this.agenteRepository.findOne({
      where: { id },
      relations: ['funciones', 'departamento', 'departamento.organizacion'],
    });
    if (!agente) {
      throw new Error(`Agente con ID ${id} no encontrado`);
    }

    if (!agente.departamento?.organizacion) {
      throw new BadRequestException('Agente sin organización asignada');
    }

    const previousConfig: ConverxaLLMConfig['config'] = agente.config as ConverxaLLMConfig['config'];

    // Actualizar según el tipo de agente
    const converxaAgent = agente as ConverxaAgente;
    Object.assign(converxaAgent, updateData);

    // Actualizar el asistente si cambió la configuración
    if (JSON.stringify(previousConfig) !== JSON.stringify(converxaAgent.config)) {
      const config = this.buildAgentConfig(converxaAgent, agente.departamento?.organizacion?.id, agente.departamento?.organizacion?.name || 'DefaultOrg');
      const identifier: ChatAgentIdentifier = {
        type: AgentIdentifierType.CHAT,
        agentId: previousConfig.agentId,
      };
      console.log('identifier', config);

      // Usar el factory para obtener el servicio de agente según el tipo
      const createAgentService = this.agentServiceFactory[agente.type];
      if (!createAgentService) {
        throw new BadRequestException(`Tipo de agente no soportado: ${agente.type}`);
      }

      const llmService = createAgentService(identifier, config);
      if (!previousConfig.agentId) {
        console.log('set to chatbot:', identifier.type);
        throw new Error('No se ha creado la logica para obtener el agentId para el tipo de agente');
      }
      await llmService.updateAgent(config, previousConfig.agentId);
    }
    if (converxaAgent.config && !converxaAgent.config.agentId) {
      const prevConverxaConfig = previousConfig;
      converxaAgent.config.agentId = prevConverxaConfig?.agentId;
    }
    const updatedConverxaAgent = await this.agenteRepository.save(converxaAgent);
    // Emit update event
    this.emitUpdateEvent(id, userId);
    return updatedConverxaAgent;
  }

  async updateEscalateToHuman(id: number, canEscalateToHuman: boolean): Promise<Agente> {
    const agente = await this.agenteRepository.findOne({
      where: { id },
      relations: ['funciones', 'departamento', 'departamento.organizacion'],
    });

    if (!agente) {
      throw new NotFoundException(`Agente con ID ${id} no encontrado`);
    }

    if (!agente.departamento?.organizacion) {
      throw new BadRequestException('Agente sin organización asignada');
    }

    const config = this.buildAgentConfig(agente, agente.departamento.organizacion.id, agente.departamento.organizacion.name || 'DefaultOrg');
    const identifier: ChatAgentIdentifier = {
      type: AgentIdentifierType.CHAT,
      agentId: config.agentId,
    };

    // Usar el factory para obtener el servicio de agente según el tipo
    const createAgentService = this.agentServiceFactory[agente.type];
    if (!createAgentService) {
      throw new BadRequestException(`Tipo de agente no soportado: ${agente.type}`);
    }

    // Asegurar que DBagentId se pase correctamente
    if (!config.DBagentId) {
      throw new Error('DBagentId es requerido para update escalate to human');
    }

    const llmService = createAgentService(identifier, config);
    await llmService.updateFunctions(agente.funciones, config.agentId, !!agente.config.vectorStoreId, canEscalateToHuman);
    agente.canEscalateToHuman = canEscalateToHuman;
    return this.agenteRepository.save(agente);
  }

  async updateFunctions(functions: Funcion[], agentId: string, hasVectorStore: boolean, canEscalateToHuman: boolean, organizationId: number, DBagentId: number): Promise<void> {
    if (!DBagentId) {
      throw new Error('DBagentId debe estar definido para actualizar funciones');
    }
    const llmService = new ConverxaLLMService(
      this.functionCallService,
      this.systemEventsService,
      this.integrationRouterService,
      this.hitlTypesService,
      { type: AgentIdentifierType.CHAT, agentId },
      { agentId, organizationId, DBagentId },
    );
    return llmService.updateFunctions(functions, agentId, hasVectorStore, canEscalateToHuman);
  }

  async updateAgentAfterHitlChange(organizationId: number): Promise<void> {
    try {
      // Buscar TODOS los agentes asociados a la organización (uno por departamento)
      const agentes = await this.agenteRepository.find({
        where: {
          departamento: {
            organizacion: {
              id: organizationId,
            },
          },
        },
        relations: ['funciones', 'departamento', 'departamento.organizacion'],
      });

      if (!agentes || agentes.length === 0) {
        console.log(`No se encontraron agentes para la organización ${organizationId}`);
        return;
      }

      console.log(`[HITL UPDATE] Actualizando ${agentes.length} agentes para organización ${organizationId}`);

      // Actualizar funciones de TODOS los agentes de la organización
      for (const agente of agentes) {
        if (!agente.config?.agentId) {
          console.log(`[HITL UPDATE] Agente ${agente.id} del departamento "${agente.departamento.name}" no tiene agentId configurado, saltando`);
          continue;
        }

        console.log(`[HITL UPDATE] Actualizando agente ${agente.id} del departamento "${agente.departamento.name}"`);

        try {
          await this.updateFunctions(
            agente.funciones || [],
            agente.config.agentId as string,
            !!agente.config.vectorStoreId,
            agente.canEscalateToHuman || false,
            organizationId,
            agente.id,
          );
          console.log(`[HITL UPDATE] ✅ Agente ${agente.id} actualizado correctamente`);
        } catch (agentError) {
          console.error(`[HITL UPDATE] ❌ Error actualizando agente ${agente.id} del departamento "${agente.departamento.name}":`, agentError);
          // Continuamos con el siguiente agente aunque uno falle
        }
      }

      console.log(`[HITL UPDATE] Finalizada actualización de agentes para organización ${organizationId}`);
    } catch (error) {
      console.error(`[HITL UPDATE] Error general actualizando agentes para organización ${organizationId}:`, error);
      // No lanzamos el error para no afectar el flujo principal
    }
  }

  /**
   * Event listeners para cambios en tipos HITL
   */
  @OnEvent(HitlEventType.TYPE_CREATED)
  async handleHitlTypeCreated(event: HitlEvent): Promise<void> {
    console.log(`[HITL EVENT] Tipo HITL creado: ${event.hitlTypeName} en organización ${event.organizationId}`);
    await this.updateAgentAfterHitlChange(event.organizationId);
  }

  @OnEvent(HitlEventType.TYPE_UPDATED)
  async handleHitlTypeUpdated(event: HitlEvent): Promise<void> {
    console.log(`[HITL EVENT] Tipo HITL actualizado: ${event.hitlTypeName} en organización ${event.organizationId}`);
    await this.updateAgentAfterHitlChange(event.organizationId);
  }

  @OnEvent(HitlEventType.TYPE_DELETED)
  async handleHitlTypeDeleted(event: HitlEvent): Promise<void> {
    console.log(`[HITL EVENT] Tipo HITL eliminado: ${event.hitlTypeName} en organización ${event.organizationId}`);
    await this.updateAgentAfterHitlChange(event.organizationId);
  }

  @OnEvent(HitlEventType.USER_ASSIGNED)
  async handleHitlUserAssigned(event: HitlEvent): Promise<void> {
    console.log(`[HITL EVENT] Usuario ${event.userId} asignado al tipo HITL: ${event.hitlTypeName} en organización ${event.organizationId}`);
    await this.updateAgentAfterHitlChange(event.organizationId);
  }

  @OnEvent(HitlEventType.USER_REMOVED)
  async handleHitlUserRemoved(event: HitlEvent): Promise<void> {
    console.log(`[HITL EVENT] Usuario ${event.userId} removido del tipo HITL: ${event.hitlTypeName} en organización ${event.organizationId}`);
    await this.updateAgentAfterHitlChange(event.organizationId);
  }

  async getAudioText(audioName: string) {
    return ConverxaLLMService.getAudioText(audioName);
  }

  async textToAudio(text: string): Promise<string> {
    return ConverxaLLMService.textToAudio(text);
  }

  // Métodos para operaciones de vectorStore
  async createVectorStore(agentId: number): Promise<string> {
    return ConverxaLLMService.createVectorStore(agentId);
  }

  async deleteVectorStore(vectorStoreId: string): Promise<void> {
    return ConverxaLLMService.deleteVectorStore(vectorStoreId);
  }

  async uploadFileToVectorStore(file: Express.Multer.File, vectorStoreId: string): Promise<string> {
    return ConverxaLLMService.uploadFileToVectorStore(file, vectorStoreId);
  }

  async deleteFileFromVectorStore(fileId: string): Promise<void> {
    return ConverxaLLMService.deleteFileFromVectorStore(fileId);
  }

  async updateAssistantToolResources(assistantId: string, vectorStoreId: string | null, data: { funciones: Funcion[]; add: boolean; hitl: boolean }): Promise<void> {
    return ConverxaLLMService.updateAssistantToolResources(assistantId, vectorStoreId, data);
  }

  private emitUpdateEvent(agentId: number, userId: number): void {
    const room = `test-chat-${userId}`;
    this.socketService.sendMessageToRoom(room, 'agent:updated', {
      agentId: agentId,
      updatedBy: userId,
    });
  }
}
