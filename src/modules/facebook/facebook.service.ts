import { User } from '@models/User.entity';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';
import { IntegrationService } from '@modules/integration/integration.service';
import { CreateIntegrationMessagerDto } from './dto/create-integration-messager.dto';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { OrganizationService } from '@modules/organization/organization.service';
import { DepartmentService } from '@modules/department/department.service';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationService: IntegrationService,
    private readonly organizationService: OrganizationService,
    private readonly departmentService: DepartmentService,
  ) {}

  async createIntegrationWhatsApp(user: User, createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto, organizationId: number, departamentoId: number) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${createIntegrationWhatsAppDto.code}`,
      );
      const accessToken = response.data.access_token;

      if (!accessToken) {
        throw new Error('Failed to exchange code for token');
      }

      const integration = await this.integrationService.createIntegrationWhatsApp(user, organizationId, departamentoId, createIntegrationWhatsAppDto, accessToken);

      await axios.delete(`https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      await axios.post(
        `https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`,
        {
          callback_url: `${this.configService.get<string>('url.web_hook_whatsapp')}/api/facebook/webhook/${integration.id}/api`,
          verify_token: accessToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return integration;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data);
      }
      throw new Error('Failed to create integration');
    }
  }

  async createIntegrationMessager(user: User, createIntegrationMessagerDto: CreateIntegrationMessagerDto, organizationId: number, departamentoId: number) {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);

    const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
    if (!allowedRoles.includes(rolInOrganization)) {
      throw new BadRequestException('No tienes permisos para crear la integración');
    }

    const departamento = await this.departmentService.getDepartmentByOrganizationAndDepartmentId(organizationId, departamentoId);

    if (!departamento) {
      throw new BadRequestException(`El departamento con ID ${departamentoId} no existe en la organización con ID ${organizationId}`);
    }

    const response = await axios.get(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${createIntegrationMessagerDto.code}`,
    );
    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new BadRequestException('Failed to exchange code for token');
    }

    const pagesResponse = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: accessToken },
    });

    const pageOneId = pagesResponse.data.data[0].id;
    const pageOneToken = pagesResponse.data.data[0].access_token;

    if (!pageOneId || !pageOneToken) {
      throw new BadRequestException('Failed to get page id or token');
    }
    const searchIntegration = await this.integrationService.getIntegrationMessagerByPageId(pageOneId);

    if (searchIntegration) {
      throw new BadRequestException('Integration already exists');
    }

    const responseSucribed = await axios.post(
      `https://graph.facebook.com/v21.0/${pageOneId}/subscribed_apps`,
      {
        subscribed_fields: ['messages', 'messaging_postbacks'],
      },
      {
        params: {
          access_token: pageOneToken,
        },
      },
    );

    if (!responseSucribed.data.success) {
      throw new BadRequestException('Failed to subscribe');
    }

    const integration = await this.integrationService.createIntegrationMessager(departamento, pageOneId, pageOneToken);

    return integration;
  }
}
