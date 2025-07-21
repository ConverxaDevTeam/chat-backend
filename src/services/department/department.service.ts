import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departamento } from '@models/Departamento.entity';
import { CreateDepartmentDto } from '@modules/department/dto/create-department.dto';
import { UpdateDepartmentDto } from '@modules/department/dto/update-department.dto';
import { Organization } from '@models/Organization.entity';
import { AgenteType } from 'src/interfaces/agent';
import { Agente } from '@models/agent/Agente.entity';
import { IntegrationType } from '@models/Integration.entity';
import { AgentManagerService } from '@modules/agent-manager/agent-manager.service';
import { OrganizationLimitService } from '@modules/organization/organization-limit.service';

interface DepartmentWithAgents {
  id: number;
  name: string;
  description: string;
  organizacion: { id: number };
  integrations: {
    id: number;
    type: IntegrationType;
  }[];
  agente?: {
    id: number;
    funciones: { id: number; name: string; autenticador?: { id: number } }[];
  };
}

interface DepartmentResponse {
  ok: boolean;
  department: DepartmentWithAgents;
}

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Departamento)
    private readonly departmentRepository: Repository<Departamento>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Agente)
    private readonly agentRepository: Repository<Agente>,
    private readonly agentManagerService: AgentManagerService,
    private readonly organizationLimitService: OrganizationLimitService,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Departamento> {
    const organization = await this.organizationRepository.findOne({
      where: { id: createDepartmentDto.organizacion_id },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${createDepartmentDto.organizacion_id} not found`);
    }

    // Verificar límite de departamentos antes de crear
    const limitCheck = await this.organizationLimitService.hasReachedDepartmentLimit(createDepartmentDto.organizacion_id);

    if (limitCheck.hasReachedLimit) {
      throw new BadRequestException(
        `Has alcanzado el límite máximo de ${limitCheck.limit} departamentos para esta organización. ` + `Actualmente tienes ${limitCheck.current} departamentos.`,
      );
    }

    const department = this.departmentRepository.create({
      name: createDepartmentDto.name,
      description: createDepartmentDto.description,
      organizacion: organization,
    });

    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Departamento[]> {
    return this.departmentRepository.find({
      relations: ['organizacion'],
    });
  }

  async findOne(id: number): Promise<Departamento> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['organizacion', 'integrations'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async findByOrganization(organizationId: number): Promise<Departamento[]> {
    return this.departmentRepository.find({
      where: { organizacion: { id: organizationId } },
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.departmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<Departamento> {
    const department = await this.findOne(id);
    const { ...updateData } = updateDepartmentDto;

    Object.assign(department, updateData);
    return this.departmentRepository.save(department);
  }

  async getDepartmentWithDetails(departmentId: number): Promise<DepartmentResponse> {
    // Buscar departamento existente
    const department = await this.departmentRepository.findOne({
      where: {
        id: departmentId,
      },
      relations: ['organizacion', 'agente', 'agente.funciones', 'agente.funciones.autenticador', 'integrations'],
      select: {
        id: true,
        name: true,
        description: true,
        organizacion: {
          id: true,
        },
        integrations: {
          id: true,
          type: true,
        },
        agente: {
          id: true,
          funciones: {
            id: true,
            name: true,
            config: {},
            autenticador: {
              id: true,
            },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    // Verificar si existe un agente asociado al departamento
    if (!department.agente) {
      department.agente = await this.agentManagerService.createAgent({
        name: 'default agent',
        departamento_id: department.id,
        type: AgenteType.CONVERXA_ASISTENTE,
        organization_id: department.organizacion.id,
        config: {
          instruccion: 'Eres un asistente para registrar las quejas de los usuarios',
        },
      });
    }

    const departmentResponse: DepartmentWithAgents = {
      id: department.id,
      name: department.name,
      description: department.description,
      organizacion: { id: department.organizacion.id },
      integrations: department.integrations,
      agente: department.agente
        ? {
            id: department.agente.id,
            funciones: department.agente.funciones
              ? department.agente.funciones.map((funcion) => ({
                  id: funcion.id,
                  name: funcion.name,
                  config: funcion.config,
                  autenticador: funcion.autenticador ? { id: funcion.autenticador.id } : undefined,
                }))
              : [],
          }
        : undefined,
    };

    return {
      ok: true,
      department: departmentResponse,
    };
  }
}
