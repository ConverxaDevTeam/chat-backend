import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationLimit } from '../../models/OrganizationLimit.entity';
import { Organization, OrganizationType } from '../../models/Organization.entity';
import { CreateOrganizationLimitDto, UpdateOrganizationLimitDto } from './dto/organization-limit.dto';

@Injectable()
export class OrganizationLimitService {
  constructor(
    @InjectRepository(OrganizationLimit)
    private organizationLimitRepository: Repository<OrganizationLimit>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async create(createDto: CreateOrganizationLimitDto): Promise<OrganizationLimit> {
    const organization = await this.organizationRepository.findOne({
      where: { id: createDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organización con ID ${createDto.organizationId} no encontrada`);
    }

    // Para PRODUCTION y MVP no se permiten límites
    if (organization.type === OrganizationType.PRODUCTION || organization.type === OrganizationType.MVP) {
      throw new BadRequestException(`No se pueden crear límites para organizaciones de tipo ${organization.type}`);
    }

    // Verificar si la organización ya tiene límites configurados
    const existingLimit = await this.organizationLimitRepository.findOne({
      where: { organizationId: createDto.organizationId },
    });

    if (existingLimit) {
      throw new BadRequestException(`La organización ya tiene límites configurados`);
    }

    let limit: OrganizationLimit;

    // Configurar valores predeterminados según el tipo de organización
    if (organization.type === OrganizationType.FREE) {
      // Para FREE, los valores son fijos: 50 conversaciones, 15 días, no mensual
      limit = this.organizationLimitRepository.create({
        conversationLimit: 50,
        durationDays: 15,
        isMonthly: false,
        organizationId: createDto.organizationId,
      });
    } else {
      // Para CUSTOM, los valores son configurables y mensuales por defecto
      limit = this.organizationLimitRepository.create({
        ...createDto,
        isMonthly: createDto.isMonthly !== undefined ? createDto.isMonthly : true,
      });
    }
    
    return this.organizationLimitRepository.save(limit);
  }

  async findByOrganizationId(organizationId: number): Promise<OrganizationLimit> {
    const limit = await this.organizationLimitRepository.findOne({
      where: { organizationId },
    });

    if (!limit) {
      throw new NotFoundException(`Límites para la organización con ID ${organizationId} no encontrados`);
    }

    return limit;
  }

  async update(organizationId: number, updateDto: UpdateOrganizationLimitDto): Promise<OrganizationLimit> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organización con ID ${organizationId} no encontrada`);
    }

    // Verificar si la organización tiene límites configurados
    const existingLimit = await this.organizationLimitRepository.findOne({
      where: { organizationId },
    });

    if (!existingLimit) {
      throw new NotFoundException(`Límites para la organización con ID ${organizationId} no encontrados`);
    }

    // Para organizaciones FREE, no se permiten modificaciones
    if (organization.type === OrganizationType.FREE) {
      throw new BadRequestException(`No se pueden modificar los límites de una organización tipo FREE`);
    }

    // Actualizar los valores
    Object.assign(existingLimit, updateDto);
    return this.organizationLimitRepository.save(existingLimit);
  }

  async remove(organizationId: number): Promise<void> {
    const result = await this.organizationLimitRepository.delete({ organizationId });

    if (result.affected === 0) {
      throw new NotFoundException(`Límites para la organización con ID ${organizationId} no encontrados`);
    }
  }

  async createDefaultLimitForOrganization(organization: Organization): Promise<OrganizationLimit | null> {
    // Verificar si ya existe un límite para esta organización
    const existingLimit = await this.organizationLimitRepository.findOne({
      where: { organizationId: organization.id },
    });

    if (existingLimit) {
      return existingLimit;
    }

    // Para PRODUCTION y MVP no creamos límites
    if (organization.type === OrganizationType.PRODUCTION || organization.type === OrganizationType.MVP) {
      return null;
    }

    // Crear límites por defecto según el tipo de organización
    let limitData: Partial<OrganizationLimit>;

    if (organization.type === OrganizationType.FREE) {
      limitData = {
        conversationLimit: 50,
        durationDays: 15,
        isMonthly: false,
      };
    } else {
      // Para CUSTOM
      limitData = {
        conversationLimit: 100, // Valor por defecto para CUSTOM
        durationDays: 30,
        isMonthly: true,
      };
    }

    const newLimit = this.organizationLimitRepository.create({
      ...limitData,
      organizationId: organization.id,
    });

    return this.organizationLimitRepository.save(newLimit);
  }
}
