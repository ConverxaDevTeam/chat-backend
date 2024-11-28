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
    // Verificar que la organización existe
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('La organización no existe');
    }

    // Buscar el primer departamento de la organización
    let department = await this.departmentRepository.findOne({
      where: { organizacion: { id: organizationId } },
      relations: ['chats', 'chats.agentes'],
    });

    // Si no existe, crear uno nuevo
    if (!department) {
      department = await this.create({
        name: 'Departamento Default',
        organizacion_id: organizationId,
      });
    }

    // Buscar el primer chat del departamento
    let chat = department.chats?.[0];

    // Si no existe chat o agente, crearlos
    if (!chat || !chat.agentes?.length) {
      // Crear agente default
      const agent = await this.llmAgentService.createAgent({
        name: 'Agente Default',
        type: AgenteType.LLM1_ASISTENTE,
        organization_id: organizationId,
      });

      // Crear chat default
      chat = await this.chatRepository.save({
        nombre: 'Chat Default',
        descripcion: 'Chat creado automáticamente',
        departamento: department,
        agentes: [agent],
      });
    }

    return {
      department,
      chat,
      agent: chat.agentes,
      integrations: [], // TODO: Implementar integrations si es necesario
    };
  }
}
