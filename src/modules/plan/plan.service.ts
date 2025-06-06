import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationType } from '@models/Organization.entity';
import { User } from '@models/User.entity';
import { UserOrganization, OrganizationRoleType } from '@models/UserOrganization.entity';
import { EmailService } from '@modules/email/email.service';
import { ConfigService } from '@nestjs/config';
import { logger } from 'src/main';
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

    organization.type = dto.type;

    if (dto.type === OrganizationType.CUSTOM) {
      if (!dto.daysToUpdate) {
        throw new BadRequestException('Days to update must be provided for CUSTOM organization type');
      }

      // Reiniciar el contador de conversaciones a 0 cuando se cambia a tipo CUSTOM
      organization.conversationCount = 0;
    }

    // Guardar los cambios en la organización
    const updatedOrganization = await this.organizationRepository.save(organization);

    try {
      // Buscar el administrador de la organización para enviar la notificación
      const adminUserOrgs = await this.userOrganizationRepository.find({
        where: {
          organization: { id: organizationId },
          role: OrganizationRoleType.OWNER,
        },
        relations: ['user', 'organization'],
      });

      if (adminUserOrgs && adminUserOrgs.length > 0) {
        // Enviar correo de notificación a los administradores
        for (const adminUserOrg of adminUserOrgs) {
          if (adminUserOrg.user) {
            await this.emailService.sendPlanChangeEmail(updatedOrganization, adminUserOrg.user, dto);
            logger.log(`Plan change notification sent to admin ${adminUserOrg.user.email} of organization ${organizationId}`);
          }
        }
      } else {
        logger.warn(`Could not find admin users for organization ${organizationId} to send plan change notification`);
      }
    } catch (error) {
      // No interrumpir el flujo principal si falla el envío de correo
      logger.error(`Failed to send plan change notification for organization ${organizationId}:`, error);
    }

    return updatedOrganization;
  }
}
