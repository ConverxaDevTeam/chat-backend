import { forwardRef, Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from '../../modules/llm-agent/dto/CreateAgent.dto';
import { AgenteType, AgentIdentifierType, ChatAgentIdentifier, CreateAgentConfig, SofiaLLMConfig } from 'src/interfaces/agent';
import { SocketService } from '@modules/socket/socket.service';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { Departamento } from '@models/Departamento.entity';
import { SystemEventsService } from '@modules/system-events/system-events.service';
import { Funcion } from '@models/agent/Function.entity';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';
import { ClaudeSonetService } from 'src/services/llm-agent/claude-sonet.service';
import { BaseAgent } from 'src/services/llm-agent/base-agent';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';

// Tipos para las configuraciones de agentes
type SofiaAgente = Agente<SofiaLLMConfig>;

// Factory para crear servicios de agente según su tipo
type AgentServiceFactory = {
  [key in AgenteType]: (identifier: ChatAgentIdentifier, config: CreateAgentConfig) => BaseAgent;
};

@Injectable()
export class AgentManagerService {
  private readonly agentServiceFactory: AgentServiceFactory;

  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente<SofiaLLMConfig>>,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly functionCallService: FunctionCallService,
    private readonly systemEventsService: SystemEventsService,
    private readonly integrationRouterService: IntegrationRouterService,
  ) {
    this.agentServiceFactory = {
      [AgenteType.SOFIA_ASISTENTE]: (identifier, config) => {
        // Validar que DBagentId esté presente
        if (!config.DBagentId) {
          throw new Error('DBagentId debe estar definido cuando se crea SofiaLLMService');
        }
        return new SofiaLLMService(this.functionCallService, this.systemEventsService, this.integrationRouterService, identifier, config);
      },
      [AgenteType.CLAUDE]: (identifier, config) => new ClaudeSonetService(this.functionCallService, this.systemEventsService, this.integrationRouterService, identifier, config),
    };
  }

  private buildAgentConfig(agente: SofiaAgente, organizationId: number): CreateAgentConfig {
    if (!agente.config?.instruccion) {
      throw new Error('La configuración del agente debe incluir una instrucción no vacía');
    }
    return {
      name: `sofia_${agente.departamento.id}_${agente.name}`,
      instruccion: agente.config.instruccion,
      agentId: agente.config.agentId ?? '',
      DBagentId: agente.id,
      organizationId: organizationId,
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
      type: createAgentDto.type as AgenteType.SOFIA_ASISTENTE,
      config: plainConfig,
      departamento: departamento_id ? ({ id: departamento_id } as Partial<Departamento>) : undefined,
    });

    // Inicializar la configuración según el tipo de agente
    switch (agente.type) {
      case AgenteType.SOFIA_ASISTENTE: {
        const sofiaConfig: SofiaLLMConfig = {
          type: AgenteType.SOFIA_ASISTENTE,
          config: {
            instruccion: createAgentDto.config?.instruccion || '',
          },
        };
        agente.config = sofiaConfig.config;
        break;
      }
    }

    // Inicializar el agente según su tipo
    const sofiaAgent = agente as Agente<SofiaLLMConfig>;
    console.log('on create agent', sofiaAgent);
    const sofiaConfig = this.buildAgentConfig(sofiaAgent, createAgentDto.organization_id);
    const identifier: ChatAgentIdentifier = {
      type: AgentIdentifierType.CHAT,
      agentId: sofiaConfig.agentId,
    };

    // Usar el factory para crear el servicio de agente según el tipo
    const createAgentService = this.agentServiceFactory[agente.type];
    if (!createAgentService) {
      throw new BadRequestException(`Tipo de agente no soportado: ${agente.type}`);
    }

    const llmService = createAgentService(identifier, sofiaConfig);
    await llmService.init();
    sofiaAgent.config.agentId = llmService.getAgentId();

    // Guardar el ID del asistente
    const savedAgente = await this.agenteRepository.save(sofiaAgent);
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

    const previousConfig: SofiaLLMConfig['config'] = agente.config as SofiaLLMConfig['config'];

    // Actualizar según el tipo de agente
    const sofiaAgent = agente as SofiaAgente;
    Object.assign(sofiaAgent, updateData);

    // Actualizar el asistente si cambió la configuración
    if (JSON.stringify(previousConfig) !== JSON.stringify(sofiaAgent.config)) {
      const config = this.buildAgentConfig(sofiaAgent, agente.departamento?.organizacion?.id);
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
        throw new Error('No se ha creado la logica para obtener el agentId para el tipo de agente');
      }
      await llmService.updateAgent(config, previousConfig.agentId);
    }
    if (sofiaAgent.config && !sofiaAgent.config.agentId) {
      const prevSofiaConfig = previousConfig;
      sofiaAgent.config.agentId = prevSofiaConfig?.agentId;
    }
    const updatedSofiaAgent = await this.agenteRepository.save(sofiaAgent);
    // Emit update event
    this.emitUpdateEvent(id, userId);
    return updatedSofiaAgent;
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

    const config = this.buildAgentConfig(agente, agente.departamento.organizacion.id);
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
    const llmService = new SofiaLLMService(
      this.functionCallService,
      this.systemEventsService,
      this.integrationRouterService,
      { type: AgentIdentifierType.CHAT, agentId },
      { agentId, organizationId, DBagentId },
    );
    return llmService.updateFunctions(functions, agentId, hasVectorStore, canEscalateToHuman);
  }

  async getAudioText(audioName: string) {
    return SofiaLLMService.getAudioText(audioName);
  }

  async textToAudio(text: string): Promise<string> {
    return SofiaLLMService.textToAudio(text);
  }

  // Métodos para operaciones de vectorStore
  async createVectorStore(agentId: number): Promise<string> {
    return SofiaLLMService.createVectorStore(agentId);
  }

  async deleteVectorStore(vectorStoreId: string): Promise<void> {
    return SofiaLLMService.deleteVectorStore(vectorStoreId);
  }

  async uploadFileToVectorStore(file: Express.Multer.File, vectorStoreId: string): Promise<string> {
    return SofiaLLMService.uploadFileToVectorStore(file, vectorStoreId);
  }

  async deleteFileFromVectorStore(fileId: string): Promise<void> {
    return SofiaLLMService.deleteFileFromVectorStore(fileId);
  }

  async updateAssistantToolResources(assistantId: string, vectorStoreId: string | null, data: { funciones: Funcion[]; add: boolean; hitl: boolean }): Promise<void> {
    return SofiaLLMService.updateAssistantToolResources(assistantId, vectorStoreId, data);
  }

  private emitUpdateEvent(agentId: number, userId: number): void {
    const room = `test-chat-${userId}`;
    this.socketService.sendMessageToRoom(room, 'agent:updated', {
      agentId: agentId,
      updatedBy: userId,
    });
  }
}
