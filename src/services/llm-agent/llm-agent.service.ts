import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Chat } from '@models/Chat.entity';
import { Departamento } from '@models/Departamento.entity';
import { CreateAgentDto } from '../../modules/llm-agent/dto/CreateAgent.dto';
import { AgenteType } from 'src/interfaces/agent';

@Injectable()
export class LlmAgentService {
  constructor(
    @InjectRepository(Agente)
    private readonly agentRepository: Repository<Agente>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
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
    const { chat_id, departamento_id, organization_id, ...rest } = data;
  
    // Verificar o crear Chat predeterminado
    const chat = await this.getOrCreateDefaultChat(chat_id);
  
    // Verificar o crear Departamento predeterminado
    const departamento = await this.getOrCreateDefaultDepartamento(organization_id, departamento_id);
  
    // Crear el agente
    const newAgent = this.agentRepository.create({
      ...rest, // Asignar el resto de los campos del DTO
      chat, // Asignar la relación completa con el Chat
      departamento, // Asignar la relación completa con el Departamento
    } as DeepPartial<Agente>); // Cast para que TypeORM lo reconozca como válido
  
    return this.agentRepository.save(newAgent);
  }
  
  // Actualizar un agente existente
  async updateAgent(id: number, data: Partial<Agente>): Promise<Agente> {
    const agent = await this.getAgentById(id);

    // Actualizar los campos del agente
    Object.assign(agent, data);

    return this.agentRepository.save(agent);
  }

  // Método auxiliar: Obtener o crear Chat predeterminado
  private async getOrCreateDefaultChat(chat_id?: number): Promise<Chat> {
    if (chat_id) {
      const chat = await this.chatRepository.findOne({ where: { id: chat_id } });
      if (chat) return chat;
    }
  
    // Obtener el departamento predeterminado
    const defaultDepartamento = await this.departamentoRepository.findOne({
      where: { id: 1 }, // Ajusta este ID según tu lógica
    });
  
    if (!defaultDepartamento) {
      throw new Error('Departamento predeterminado no encontrado');
    }
  
    // Crear Chat predeterminado
    const defaultChat = this.chatRepository.create({
      usuario_id: 'default-user', // Campo directo
      departamento: defaultDepartamento, // Relación completa
      started_at: new Date(),
    } as DeepPartial<Chat>); // Cast para que TypeORM lo reconozca como válido
  
    return this.chatRepository.save(defaultChat);
  }
  

  // Método auxiliar: Obtener o crear Departamento predeterminado
  private async getOrCreateDefaultDepartamento(organizacion_id:number, departamento_id?: number): Promise<Departamento> {
    if (departamento_id) {
      const departamento = await this.departamentoRepository.findOne({
        where: { id: departamento_id },
      });
      if (departamento) return departamento;
    }

    // Crear Departamento predeterminado si no existe
    const defaultDepartamento = this.departamentoRepository.create({
      organizacion: { id: organizacion_id },
      name: 'Default Department',
    });
    return this.departamentoRepository.save(defaultDepartamento);
  }
}
