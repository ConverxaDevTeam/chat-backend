import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Departamento } from '@models/Departamento.entity';
import { CreateDepartmentDto } from '@modules/department/dto/create-department.dto';
import { Organization } from '@models/Organization.entity';
import { AgenteType } from 'src/interfaces/agent';
import { Agente } from '@models/agent/Agente.entity';
import { defaultDepartmentName } from 'src/interfaces/department';

interface DepartmentWithAgents {
  id: number;
  name: string;
  organizacion: { id: number };
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
    @Inject(DataSource)
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
      relations: ['organizacion', 'departamentos'],
    });
  }

  async findOne(id: number): Promise<Departamento> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['organizacion', 'departamentos'],
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return department;
  }

  async findByOrganization(organizationId: number): Promise<Departamento[]> {
    return this.departmentRepository.find({
      where: { organizacion: { id: organizationId } },
      relations: ['departamentos'],
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.departmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
  }

  async getDefaultDepartment(organizationId: number): Promise<DepartmentResponse> {
    // Buscar departamento existente
    let department = await this.departmentRepository.findOne({
      where: {
        name: defaultDepartmentName,
        organizacion: { id: organizationId },
      },
      relations: ['organizacion', 'agente', 'agente.funciones', 'agente.funciones.autenticador'],
      select: {
        id: true,
        name: true,
        organizacion: {
          id: true,
        },
        agente: {
          id: true,
          funciones: {
            id: true,
            name: true,
            autenticador: {
              id: true,
            },
          },
        },
      },
    });

    // Crear departamento si no existe
    if (!department) {
      console.log('Department not found. Creating new default department...');
      department = await this.departmentRepository.save({
        name: defaultDepartmentName,
        organizacion: { id: organizationId },
      });

      // Obtener las relaciones
      department = await this.departmentRepository.findOne({
        where: { id: department.id },
        relations: ['organizacion', 'agente', 'agente.funciones', 'agente.funciones.autenticador'],
        select: {
          id: true,
          name: true,
          organizacion: {
            id: true,
          },
          agente: {
            id: true,
            funciones: {
              id: true,
              name: true,
              autenticador: {
                id: true,
              },
            },
          },
        },
      });

      if (!department) {
        throw new NotFoundException('Could not create default department');
      }
    }

    // Verificar si existe un agente asociado al departamento
    if (!department.agente) {
      console.log('Agent not found for department. Creating default agent...');
      department.agente = await this.agentRepository.save({
        name: 'default agent',
        departamento: { id: department.id },
        type: AgenteType.SOFIA_ASISTENTE,
        organization_id: organizationId,
        config: {
          instruccion: 'Eres un asistente para registrar las quejas de los usuarios',
        },
      });
    }

    const departmentResponse: DepartmentWithAgents = {
      id: department.id,
      name: department.name,
      organizacion: { id: department.organizacion.id },
      agente: department.agente
        ? {
            id: department.agente.id,
            funciones: department.agente.funciones
              ? department.agente.funciones.map((funcion) => ({
                  id: funcion.id,
                  name: funcion.name,
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
