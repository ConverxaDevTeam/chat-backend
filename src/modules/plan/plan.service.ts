import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationType } from '@models/Organization.entity';
import { User } from '@models/User.entity';
import { UserOrganization } from '@models/UserOrganization.entity';
import { EmailService } from '@modules/email/email.service';
import { ConfigService } from '@nestjs/config';
import { UpdateCustomPlanDto } from './dto/update-custom-plan.dto';
import { ChangeOrganizationTypeDto } from './dto/change-organization-type.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async requestCustomPlan(organizationId: number, userId: number): Promise<void> {
    // Validate user is part of the organization
    const userOrgLink = await this.userOrganizationRepository.findOne({
      where: { user: { id: userId }, organization: { id: organizationId } },
    });

    if (!userOrgLink) {
      throw new ForbiddenException('You are not authorized to request a custom plan for this organization.');
    }

    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const requestingUser = await this.userRepository.findOne({ where: { id: userId } });
    if (!requestingUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const recipientEmail = this.configService.get<string>('CUSTOM_PLAN_REQUEST_RECIPIENT_EMAIL');
    if (!recipientEmail) {
      console.error('CUSTOM_PLAN_REQUEST_RECIPIENT_EMAIL is not configured in .env');
      throw new InternalServerErrorException('Email recipient not configured.');
    }

    try {
      await this.emailService.sendCustomPlanRequestEmail(
        recipientEmail,
        organization.name,
        requestingUser.email,
        `${requestingUser.first_name || ''} ${requestingUser.last_name || ''}`.trim() || requestingUser.email,
      );
    } catch (error) {
      console.error('Failed to send custom plan request email:', error);
      // Decide if you want to throw an error or just log it and continue with notification
      throw new InternalServerErrorException('Failed to send request email.');
    }
  }

  async setPlanToCustomBySuperAdmin(organizationId: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    organization.type = OrganizationType.CUSTOM;
    // Reiniciar el contador de conversaciones a 0 cuando se cambia a tipo CUSTOM
    organization.conversationCount = 0;
    // Note: We might need to adjust organization limits here if there's a separate service/logic for it.
    return this.organizationRepository.save(organization);
  }

  async updateCustomPlanDetailsBySuperAdmin(organizationId: number, dto: UpdateCustomPlanDto): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    if (organization.type !== OrganizationType.CUSTOM) {
      throw new BadRequestException(`Organization ${organization.name} is not on a custom plan.`);
    }

    organization.conversationCount = dto.conversationCount;
    return this.organizationRepository.save(organization);
  }

  async changeOrganizationTypeBySuperAdmin(organizationId: number, dto: ChangeOrganizationTypeDto): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Cambiar el tipo de organización
    organization.type = dto.type;

    // Si el tipo es CUSTOM, verificar que se hayan proporcionado los días para actualizar
    if (dto.type === OrganizationType.CUSTOM) {
      if (!dto.daysToUpdate) {
        throw new BadRequestException('Days to update must be provided for CUSTOM organization type');
      }

      // Reiniciar el contador de conversaciones a 0 cuando se cambia a tipo CUSTOM
      organization.conversationCount = 0;
    }

    return this.organizationRepository.save(organization);
  }
}
