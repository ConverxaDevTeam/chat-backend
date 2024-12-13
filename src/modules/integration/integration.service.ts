import { Integration, IntegrationType } from '@models/Integration.entity';
import { User } from '@models/User.entity';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { DepartmentService } from '@modules/department/department.service';
import { OrganizationService } from '@modules/organization/organization.service';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Departamento } from '@models/Departamento.entity';
import { UpdateIntegrationWebChatDataDto } from './dto/update-integration-web-chat.dto';
import { CreateIntegrationWhatsAppDto } from '@modules/facebook/dto/create-integration-whats-app.dto';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly organizationService: OrganizationService,
    private readonly departmentService: DepartmentService,
    private readonly configService: ConfigService,
  ) {}

  async getIntegrationWebChat(user: User, organizationId: number, departamentoId: number): Promise<Integration> {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);

    const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
    if (!allowedRoles.includes(rolInOrganization)) {
      throw new Error('No tienes permisos para obtener la integración');
    }

    const departamento = await this.departmentService.getDepartmentByOrganizationAndDepartmentId(organizationId, departamentoId);

    if (!departamento) {
      throw new Error(`El departamento con ID ${departamentoId} no existe en la organización con ID ${organizationId}`);
    }

    const integration = await this.integrationRepository.findOne({
      where: {
        departamento: { id: departamentoId },
        type: IntegrationType.CHAT_WEB,
      },
    });

    if (!integration) {
      const newIntegration = new Integration();
      newIntegration.type = IntegrationType.CHAT_WEB;

      const config = {
        url: this.configService.get<string>('url.wss'),
        url_assets: this.configService.get<string>('url.files'),
        name: 'Sofia',
        title: 'Sofia Chat',
        cors: ['http://localhost:4000', 'http://localhost:3000'],
        sub_title: 'Prueba Aqui Sofia Chat',
        description: '¡Hola! Bienvenido a Sofia. Estoy aquí para ayudarte a encontrar respuestas y soluciones rápidamente.',
        logo: 'logo.png',
        horizontal_logo: 'horizontal-logo.png',
        edge_radius: '10',
        message_radius: '20',
        bg_color: '#15ECDA',
        bg_chat: '#F5F5F5',
        bg_user: '#ffffff',
        bg_assistant: '#b1f6f0',
        text_color: '#000000',
        text_title: '#000000',
        text_date: '#969696',
        button_color: '#15ECDA',
        button_text: '#ffffff',
      };
      newIntegration.config = JSON.stringify(config);
      newIntegration.departamento = departamento;
      await this.integrationRepository.save(newIntegration);

      const script = `(async () => {
  await import('${this.configService.get<string>('url.files')}/files/sofia-chat.min.js');
  const config = {
    id: '${newIntegration.id}',
    url: '${this.configService.get<string>('url.wss')}',
    url_assets: '${this.configService.get<string>('url.files')}',
    name: '${config.name}',
    title: '${config.title}',
    sub_title: '${config.sub_title}',
    description: '${config.description}',
    logo: '${config.logo}',
    horizontal_logo: '${config.horizontal_logo}',
    edge_radius: '${config.edge_radius}',
    message_radius: '${config.message_radius}',
    bg_color: '${config.bg_color}',
    bg_chat: '${config.bg_chat}',
    bg_user: '${config.bg_user}',
    bg_assistant: '${config.bg_assistant}',
    text_color: '${config.text_color}',
    text_title: '${config.text_title}',
    text_date: '${config.text_date}',
    button_color: '${config.button_color}',
    button_text: '${config.button_text}',
  };
  SofiaChat.default.init(config);
})();
`;

      const scriptPath = join(process.cwd(), 'uploads', 'chats', `CI${newIntegration.id}.js`);

      fs.writeFileSync(scriptPath, script);

      return newIntegration;
    }
    return integration;
  }

  async getIntegrationWebChatById(integrationId: number): Promise<Integration | null> {
    const integration = await this.integrationRepository.findOne({
      where: {
        id: integrationId,
        type: IntegrationType.CHAT_WEB,
      },
    });

    return integration;
  }

  async getDepartamentoById(id: number): Promise<Departamento | null> {
    const departamento = await this.departmentService.getDepartamentoById(id);
    return departamento;
  }

  async updateIntegrationWebChatByUserIdAndbyIntegrationId(
    user: User,
    integrationId: number,
    updateIntegrationWebChatDataDto: UpdateIntegrationWebChatDataDto,
  ): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integracion no encontrada');
    }
    const config = JSON.parse(integration.config);

    const newConfig = {
      ...config,
      cors: updateIntegrationWebChatDataDto.cors,
      title: updateIntegrationWebChatDataDto.title,
      name: updateIntegrationWebChatDataDto.name,
      sub_title: updateIntegrationWebChatDataDto.sub_title,
      description: updateIntegrationWebChatDataDto.description,
      bg_color: updateIntegrationWebChatDataDto.bg_color,
      text_title: updateIntegrationWebChatDataDto.text_title,
      bg_chat: updateIntegrationWebChatDataDto.bg_chat,
      text_color: updateIntegrationWebChatDataDto.text_color,
      bg_assistant: updateIntegrationWebChatDataDto.bg_assistant,
      bg_user: updateIntegrationWebChatDataDto.bg_user,
      button_color: updateIntegrationWebChatDataDto.button_color,
      button_text: updateIntegrationWebChatDataDto.button_text,
      text_date: updateIntegrationWebChatDataDto.text_date,
    };

    integration.config = JSON.stringify(newConfig);
    await this.integrationRepository.save(integration);

    const script = `(async () => {
      await import('${this.configService.get<string>('url.files')}/files/sofia-chat.min.js');
      const config = {
        id: '${integration.id}',
        url: '${this.configService.get<string>('url.wss')}',
        url_assets: '${this.configService.get<string>('url.files')}',
        name: '${newConfig.name}',
        title: '${newConfig.title}',
        sub_title: '${newConfig.sub_title}',
        description: '${newConfig.description}',
        logo: '${newConfig.logo}',
        horizontal_logo: '${newConfig.horizontal_logo}',
        edge_radius: '${newConfig.edge_radius}',
        message_radius: '${newConfig.message_radius}',
        bg_color: '${newConfig.bg_color}',
        bg_chat: '${newConfig.bg_chat}',
        bg_user: '${newConfig.bg_user}',
        bg_assistant: '${newConfig.bg_assistant}',
        text_color: '${newConfig.text_color}',
        text_title: '${newConfig.text_title}',
        text_date: '${newConfig.text_date}',
        button_color: '${newConfig.button_color}',
        button_text: '${newConfig.button_text}',
      };
      SofiaChat.default.init(config);
    })();
    `;

    const scriptPath = join(process.cwd(), 'uploads', 'chats', `CI${integration.id}.js`);

    fs.writeFileSync(scriptPath, script);

    return integration;
  }

  async getAllIntegrations(user: User, organizationId: number, departamentoId: number): Promise<Integration[]> {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);

    const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
    if (!allowedRoles.includes(rolInOrganization)) {
      throw new Error('No tienes permisos para obtener las integraciones');
    }

    const departamento = await this.departmentService.getDepartmentByOrganizationAndDepartmentId(organizationId, departamentoId);

    if (!departamento) {
      throw new Error(`El departamento con ID ${departamentoId} no existe en la organización con ID ${organizationId}`);
    }

    const integrations = await this.integrationRepository.find({
      where: {
        departamento: { id: departamentoId },
      },
    });

    return integrations;
  }

  async createIntegrationWhatsApp(
    user: User,
    organizationId: number,
    departamentoId: number,
    createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto,
    token: string,
  ): Promise<Integration> {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);

    const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
    if (!allowedRoles.includes(rolInOrganization)) {
      throw new Error('No tienes permisos para crear la integración');
    }

    const departamento = await this.departmentService.getDepartmentByOrganizationAndDepartmentId(organizationId, departamentoId);

    if (!departamento) {
      throw new Error(`El departamento con ID ${departamentoId} no existe en la organización con ID ${organizationId}`);
    }

    const newIntegration = new Integration();
    newIntegration.type = IntegrationType.WHATSAPP;
    newIntegration.token = token;
    newIntegration.phone_number_id = createIntegrationWhatsAppDto.phone_number_id;
    newIntegration.waba_id = createIntegrationWhatsAppDto.waba_id;
    newIntegration.departamento = departamento;
    await this.integrationRepository.save(newIntegration);

    return newIntegration;
  }

  async getIntegrationWhatsAppById(integrationId: number): Promise<Integration | null> {
    const integration = await this.integrationRepository.findOne({
      where: {
        id: integrationId,
        type: IntegrationType.WHATSAPP,
      },
    });

    return integration;
  }
}
