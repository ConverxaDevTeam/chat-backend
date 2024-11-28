import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departamento } from '@models/Departamento.entity';
import { CreateDepartmentDto } from '@modules/department/dto/create-department.dto';
import { Organization } from '@models/Organization.entity';
import { Chat } from '@models/Chat.entity';
import { LlmAgentService } from '../llm-agent/llm-agent.service';
import { AgenteType } from 'src/interfaces/agent';
import { User } from '@models/User.entity'; // Import User entity
import { DataSource } from 'typeorm';
import { Agente } from '@models/agent/Agente.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Departamento)
    private readonly departmentRepository: Repository<Departamento>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    private readonly llmAgentService: LlmAgentService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Departamento> {
    const organization = await this.organizationRepository.findOne({
      where: { id: createDepartmentDto.organizacion_id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${createDepartmentDto.organizacion_id} not found`);
    }

    const department = this.departmentRepository.create({
      name: createDepartmentDto.name,
      organizacion: organization,
    });

    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Departamento[]> {
    return this.departmentRepository.find({
      relations: ['organizacion', 'chats'],
    });
  }

  async findOne(id: number): Promise<Departamento> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['organizacion', 'chats'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async findByOrganization(organizationId: number): Promise<Departamento[]> {
    return this.departmentRepository.find({
      where: { organizacion: { id: organizationId } },
      relations: ['chats'],
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.departmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
  }

  async getDefaultDepartment(organizationId: number) {
    // Buscar departamento con sus relaciones en una sola consulta
    let department = await this.departmentRepository
      .createQueryBuilder('department')
      .leftJoinAndSelect('department.chats', 'chat')
      .leftJoinAndSelect('chat.agentes', 'agente')
      .where('department.organization_id = :organizationId', { organizationId })
      .orderBy('department.created_at', 'ASC')
      .getOne();

    // Si no existe, crear todo en una transacción
    if (!department) {
      department = await this.dataSource.transaction(async (manager) => {
        // Crear departamento
        const newDepartment = manager.create(Departamento, {
          name: 'Departamento Default',
          organizacion: { id: organizationId }, // Usar la relación en lugar del ID directo
        });
        await manager.save(newDepartment);

        // Crear agente
        const agent = manager.create(Agente, {
          name: 'Agente Default',
          type: AgenteType.LLM1_ASISTENTE,
          organization_id: organizationId,
        });
        await manager.save(agent);

        // Crear chat con el agente
        const chat = manager.create(Chat, {
          nombre: 'Chat Default',
          descripcion: 'Chat creado automáticamente',
          departamento: newDepartment,
          agentes: [agent],
        });
        await manager.save(chat);

        // Retornar departamento con sus relaciones ya creadas
        newDepartment.chats = [chat];
        chat.agentes = [agent];
        return newDepartment;
      });
    }

    // Extraer datos sin anidación
    const firstChat = department.chats[0];
    const agents = firstChat.agentes || [];

    // Limpiar datos anidados
    const cleanDepartment = {
      id: department.id,
      name: department.name,
      created_at: department.created_at,
      updated_at: department.updated_at,
    };

    const cleanChat = {
      id: firstChat.id,
      created_at: firstChat.created_at,
      updated_at: firstChat.updated_at,
    };

    const cleanAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      config: agent.config,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    }));

    return {
      ok: true,
      department: cleanDepartment,
      chat: cleanChat,
      agents: cleanAgents,
      integrations: [], // TODO: Implementar integrations
    };
  }
}
