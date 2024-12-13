import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from '../../modules/llm-agent/dto/CreateAgent.dto';
import { AgenteType, AgentIdentifierType, CreateAgentConfig, SofiaLLMConfig } from 'src/interfaces/agent';
import { SocketService } from '@modules/socket/socket.service';
import { SofiaLLMService } from './sofia-llm.service';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { Departamento } from '@models/Departamento.entity';

// Tipos para las configuraciones de agentes
type SofiaAgente = Agente<SofiaLLMConfig>;

@Injectable()
export class AgentManagerService {
  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente>,
    private readonly socketService: SocketService,
    private readonly functionCallService: FunctionCallService,
  ) {}

  private buildAgentConfig(agente: SofiaAgente): CreateAgentConfig {
    if (!agente.config?.instruccion) {
      throw new Error('La configuración del agente debe incluir una instrucción no vacía');
    }
    return {
      name: agente.name,
      instruccion: agente.config.instruccion,
      agentId: agente.config.agentId ?? '',
    };
  }

  async getAgentById(id: number): Promise<Agente> {
    const agente = await this.agenteRepository.findOne({
      where: { id },
      relations: ['funciones', 'departamento'],
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
    const agente = this.agenteRepository.create({
      ...rest,
      type: createAgentDto.type as AgenteType,
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
    if (agente.type === AgenteType.SOFIA_ASISTENTE) {
      const sofiaAgent = agente as Agente<SofiaLLMConfig>;
      const config = this.buildAgentConfig(sofiaAgent);
      const llmService = new SofiaLLMService(this.functionCallService, { type: AgentIdentifierType.CHAT }, config);
      await llmService.init();

      // Guardar el ID del asistente
      sofiaAgent.config.agentId = llmService.getAgentId();
      return await this.agenteRepository.save(sofiaAgent);
    }

    return agente;
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

    const agente = await this.agenteRepository.findOneBy({ id });
    if (!agente) {
      throw new Error(`Agente con ID ${id} no encontrado`);
    }

    const previousConfig: SofiaLLMConfig['config'] = agente.config as SofiaLLMConfig['config'];

    // Actualizar según el tipo de agente
    const sofiaAgent = agente as SofiaAgente;
    Object.assign(sofiaAgent, updateData);

    // Mantener el agentId si existe
    if (sofiaAgent.config && !sofiaAgent.config.agentId) {
      const prevSofiaConfig = previousConfig;
      sofiaAgent.config.agentId = prevSofiaConfig?.agentId;
    }

    const updatedSofiaAgent = await this.agenteRepository.save(sofiaAgent);

    // Actualizar el asistente si cambió la configuración
    if (JSON.stringify(previousConfig) !== JSON.stringify(updatedSofiaAgent.config)) {
      const config = this.buildAgentConfig(updatedSofiaAgent);
      const llmService = new SofiaLLMService(this.functionCallService, { type: AgentIdentifierType.CHAT }, config);
      if (!previousConfig.agentId) {
        throw new Error('No se ha creado la logica para obtener el agentId para el tipo de agente');
      }
      await llmService.updateAgent(config, previousConfig.agentId);
    }
    // Emit update event
    this.emitUpdateEvent(id, userId);
    return updatedSofiaAgent;
  }

  private emitUpdateEvent(agentId: number, userId: number): void {
    const room = `test-chat-${agentId}`;
    this.socketService.sendMessageToRoom(room, 'agent:updated', {
      agentId: agentId,
      updatedBy: userId,
    });
  }
}
