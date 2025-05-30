import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationLimit } from '@models/OrganizationLimit.entity';
import { Organization, OrganizationType } from '@models/Organization.entity';
import { CreateOrganizationLimitDto, UpdateOrganizationLimitDto } from './dto/organization-limit.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationLimitService {
  constructor(
    @InjectRepository(OrganizationLimit)
    private organizationLimitRepository: Repository<OrganizationLimit>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private configService: ConfigService,
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
      // Obtener el límite de conversaciones FREE desde las variables de entorno
      const freeConversationLimit = parseInt(this.configService.get('FREE_CONVERSATION_LIMIT', '50'));
      limitData = {
        conversationLimit: freeConversationLimit,
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

  /**
   * Verifica si una organización ha alcanzado su límite de conversaciones
   * @param organizationId ID de la organización a verificar
   * @returns Un objeto con información sobre el límite y si se ha alcanzado
   */
  async hasReachedConversationLimit(organizationId: number): Promise<{
    hasReachedLimit: boolean;
    limit?: number;
    current?: number;
    daysRemaining?: number;
    type?: OrganizationType;
  }> {
    // Obtener la organización
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organización con ID ${organizationId} no encontrada`);
    }

    // Para PRODUCTION y MVP no hay límites
    if (organization.type === OrganizationType.PRODUCTION || organization.type === OrganizationType.MVP) {
      return {
        hasReachedLimit: false,
        type: organization.type,
      };
    }

    // Obtener los límites de la organización
    const limit = await this.organizationLimitRepository.findOne({
      where: { organizationId },
    });

    if (!limit) {
      // Si no hay límites configurados pero es FREE o CUSTOM, crear límites por defecto
      if (organization.type === OrganizationType.FREE || organization.type === OrganizationType.CUSTOM) {
        await this.createDefaultLimitForOrganization(organization);
        // Llamar recursivamente para obtener los límites recién creados
        return this.hasReachedConversationLimit(organizationId);
      }
      return { hasReachedLimit: false };
    }

    // Verificar si se ha alcanzado el límite
    const currentCount = organization.conversationCount || 0;
    const hasReachedLimit = currentCount >= limit.conversationLimit;

    // Calcular días restantes para organizaciones FREE
    let daysRemaining: number | undefined;
    if (organization.type === OrganizationType.FREE && !limit.isMonthly) {
      // Asegurarse de que created_at sea una fecha válida
      const createdAt = organization.created_at instanceof Date ? organization.created_at : new Date(organization.created_at || Date.now());

      const expirationDate = new Date(createdAt);
      expirationDate.setDate(expirationDate.getDate() + limit.durationDays);

      const today = new Date();
      const diffTime = expirationDate.getTime() - today.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Si los días restantes son negativos, significa que ya expiró
      if (daysRemaining < 0) {
        daysRemaining = 0;
      }
    }

    return {
      hasReachedLimit,
      limit: limit.conversationLimit,
      current: currentCount,
      daysRemaining,
      type: organization.type,
    };
  }

  /**
   * Incrementa el contador de conversaciones de una organización
   * @param organizationId ID de la organización
   * @returns La organización actualizada
   */
  async incrementConversationCount(organizationId: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organización con ID ${organizationId} no encontrada`);
    }

    // Incrementar el contador de conversaciones
    organization.conversationCount = (organization.conversationCount || 0) + 1;
    return this.organizationRepository.save(organization);
  }
}
