import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departamento } from '@models/Departamento.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { Organization } from '@models/Organization.entity';
import { OrganizationLimitService } from '../organization/organization-limit.service';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Departamento)
    private readonly departmentRepository: Repository<Departamento>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
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

  async getDepartmentByOrganizationAndDepartmentId(organizationId: number, departmentId: number): Promise<Departamento> {
    const department = await this.departmentRepository.findOne({
      where: {
        organizacion: { id: organizationId },
        id: departmentId,
      },
    });

    if (!department) {
      throw new NotFoundException(`Department with ID ${departmentId} not found`);
    }

    return department;
  }

  async getDepartamentoById(id: number): Promise<Departamento | null> {
    return this.departmentRepository.findOne({
      where: {
        id,
      },
      loadRelationIds: true,
    });
  }

  async getDepartmentById(id: number): Promise<Departamento | null> {
    return this.departmentRepository.findOne({
      where: {
        id,
      },
      relations: ['organizacion'],
    });
  }
}
