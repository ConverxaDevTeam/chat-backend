import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { CreateAgentDto } from '../../modules/llm-agent/dto/CreateAgent.dto';
import { AgenteType } from 'src/interfaces/agent';

@Injectable()
export class AgentManagerService {
  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente>
  ) {}

  async getAgentById(id: number): Promise<Agente> {
    const agente = await this.agenteRepository.findOne({
      where: { 
        id
      }
    });

    if (!agente) {
      throw new Error(`Agente con ID ${id} no encontrado`);
    }

    return agente;
  }

  async createAgent(createAgentDto: CreateAgentDto): Promise<Agente> {
    const agente = this.agenteRepository.create({
      ...createAgentDto,
      type: createAgentDto.type as AgenteType,
    });

    return await this.agenteRepository.save(agente);
  }

  async updateAgent(id: number, updateData: Partial<Agente>): Promise<Agente> {
    const agente = await this.agenteRepository.findOne({
      where: { id }
    });

    if (!agente) {
      throw new Error(`Agente con ID ${id} no encontrado`);
    }

    Object.assign(agente, updateData);
    return await this.agenteRepository.save(agente);
  }
}
