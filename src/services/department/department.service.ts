import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Departamento } from '@models/Departamento.entity';
import { CreateDepartmentDto } from '@modules/department/dto/create-department.dto';
import { Organization } from '@models/Organization.entity';
import { AgenteType } from 'src/interfaces/agent';
import { Agente } from '@models/agent/Agente.entity';

interface DefaultDepartmentDataInterface {
  id: number;
  name: string;
  organizacion: { id: number };
  agentes: { id: number }[] 
}

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Departamento)
    private readonly departmentRepository: Repository<Departamento>,
    @InjectRepository(Departamento)
    private readonly defaultDepartmentRepository: Repository<DefaultDepartmentDataInterface>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
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

  async getDefaultDepartment(organizationId: number) {
    // Buscar solo los IDs necesarios
    let department = await this.defaultDepartmentRepository
      .createQueryBuilder('department')
      .select(['department.id', 'department.name'])
      .leftJoin('department.organizacion', 'organizacion')
      .addSelect(['organizacion.id'])
      .leftJoin('department.agentes', 'agente')
      .addSelect('agente.id')
      .where('department.organization_id = :organizationId', { organizationId })
      .orderBy('department.created_at', 'ASC')
      .getOne();

    // Si no existe, crear todo en una transacción
    if (!department) {
      department = await this.dataSource.transaction(async (manager) => {
        // Crear departamento
        const newDepartment = manager.create(Departamento, {
          name: 'Departamento Default',
          organizacion: { id: organizationId },
        });
        await manager.save(newDepartment);

        // Crear agente
        const agent = manager.create(Agente, {
          name: 'Agente Default',
          type: AgenteType.SOFIA_ASISTENTE,
          organization_id: organizationId,
          config: {
            instruccion: 'Eres un asistente para registrar las quejas de los usuarios'
          },
        });
        await manager.save(agent);

        // Retornar solo los IDs necesarios
        return {
          id: newDepartment.id,
          name: newDepartment.name,
          organizacion: { id: newDepartment.organizacion.id },
          agentes: [{
            id: agent.id
          }]
        };
      });
    }

    const agents = department?.agentes || [];

    return {
      ok: true,
      department: {
        id: department.id,
        name: department.name,
        organizacion: { id: department.organizacion.id },
        agentes: agents
      }
    };
  }
}
