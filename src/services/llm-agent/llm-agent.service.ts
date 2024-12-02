import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Departamento } from '@models/Departamento.entity';
import { CreateAgentDto } from '../../modules/llm-agent/dto/CreateAgent.dto';
import { AgenteType } from 'src/interfaces/agent';

@Injectable()
export class LlmAgentService {
  constructor(
    @InjectRepository(Agente)
    private readonly agentRepository: Repository<Agente>,
    @InjectRepository(Departamento)
    private readonly departamentoRepository: Repository<Departamento>,
  ) {}

  // Obtener agente por ID
  async getAgentById(id: number, organizacion_id?: number): Promise<Agente> {
    let agent = await this.agentRepository.findOne({ where: { id } });
    if (!agent) {
      if (!organizacion_id) {
        throw new Error('Organización no especificada');
      }
      agent = await this.createAgent({
        name: 'default agent',
        type: AgenteType.SOFIA_ASISTENTE,
        organization_id: organizacion_id,
        config: {
          instruccion: 'Eres un asistente para registrar las quejas de los usuarios'
        },
      });
    }
    return agent;
  }

  // Crear un nuevo agente
  async createAgent(data: CreateAgentDto): Promise<Agente> {
    const { departamento_id, organization_id, ...rest } = data;
  
    // Verificar o crear Departamento predeterminado
    const departamento = await this.getOrCreateDefaultDepartamento(organization_id, departamento_id);
  
    // Crear el agente
    const newAgent = this.agentRepository.create({
      ...rest,
      departamento,
    } as DeepPartial<Agente>);
  
    return this.agentRepository.save(newAgent);
  }
  
  // Actualizar un agente existente
  async updateAgent(id: number, data: Partial<Agente>): Promise<Agente> {
    const agent = await this.getAgentById(id);

    // Actualizar los campos del agente
    Object.assign(agent, data);

    return this.agentRepository.save(agent);
  }

  // Método auxiliar: Obtener o crear Departamento predeterminado
  private async getOrCreateDefaultDepartamento(organizacion_id:number, departamento_id?: number): Promise<Departamento> {
    if (departamento_id) {
      const departamento = await this.departamentoRepository.findOne({
        where: { id: departamento_id }
      });
      if (departamento) return departamento;
    }

    // Crear Departamento predeterminado
    const defaultDepartamento = this.departamentoRepository.create({
      name: 'Departamento Default',
      organizacion: { id: organizacion_id },
    } as DeepPartial<Departamento>);

    return this.departamentoRepository.save(defaultDepartamento);
  }
}
