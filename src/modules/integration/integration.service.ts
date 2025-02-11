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
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly DEFAULT_LOGO = '/mvp/avatar.svg';

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
        name: 'SOF.IA',
        title: 'SOF.IA LLM',
        cors: ['http://localhost:4000', 'http://localhost:3000'],
        sub_title: 'Descubre todo lo que SOFIA puede hacer por ti.',
        description: '¡Hola y bienvenido a SOFIA! Estoy aquí para ayudarte a encontrar respuestas y soluciones de manera rápida y sencilla. ¿En qué puedo asistirte hoy?',
        logo: this.DEFAULT_LOGO,
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

      this.generateAndSaveScript(newIntegration, config);

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

    this.generateAndSaveScript(integration, newConfig);

    return integration;
  }

  async getAllIntegrations(user: User, departamentoId: number): Promise<Integration[]> {
    const departamento = await this.departmentService.getDepartamentoById(departamentoId);

    if (!departamento) {
      throw new Error(`El departamento con ID ${departamentoId} no existe`);
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
    createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto & { config: string },
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

  async getIntegrationFacebookById(integrationId: number, type: IntegrationType): Promise<Integration | null> {
    const integration = await this.integrationRepository.findOne({
      where: {
        id: integrationId,
        type: type,
      },
    });

    return integration;
  }

  async getIntegrationMessagerByPageId(pageId: string): Promise<Integration | null> {
    const integration = await this.integrationRepository
      .createQueryBuilder('integration')
      .addSelect('integration.token')
      .addSelect('integration.page_id')
      .addSelect('integration.config')
      .leftJoinAndSelect('integration.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .where('integration.page_id = :pageId', { pageId })
      .andWhere('integration.type = :type', { type: IntegrationType.MESSENGER })
      .getOne();

    return integration;
  }

  async createIntegrationMessager(departamento: Departamento, page_id: string, token: string): Promise<Integration> {
    const newIntegration = new Integration();
    newIntegration.type = IntegrationType.MESSENGER;
    newIntegration.departamento = departamento;
    newIntegration.page_id = page_id;
    newIntegration.token = token;
    await this.integrationRepository.save(newIntegration);

    return newIntegration;
  }

  async getIntegrationByphoneNumberId(waba_id: string): Promise<Integration | null> {
    const integration = await this.integrationRepository.findOne({
      select: ['id', 'token', 'waba_id'],
      relations: {
        departamento: {
          organizacion: true,
        },
      },
      where: {
        waba_id,
        type: IntegrationType.WHATSAPP,
      },
    });
    return integration;
  }

  async updateIntegrationLogo(user: User, integrationId: number, file: Express.Multer.File): Promise<Integration> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG and GIF are allowed');
    }

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const config = JSON.parse(integration.config);
    const uploadDir = join(process.cwd(), 'uploads', 'users', user.id.toString());

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const extension = file.originalname.split('.').pop();
    const fileName = `integration_${integrationId}_avatar.${extension}`;
    const filePath = join(uploadDir, fileName);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
      const baseUrl = this.configService.get<string>('URL_FILES') || 'http://localhost:3001';
      config.logo = `${baseUrl}/users/${user.id}/${fileName}`;

      integration.config = JSON.stringify(config);
      await this.integrationRepository.save(integration);

      this.generateAndSaveScript(integration, config);

      return integration;
    } catch (error) {
      throw new InternalServerErrorException('Failed to save the file');
    }
  }

  async deleteIntegrationLogo(user: User, integrationId: number): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const config = JSON.parse(integration.config);
    config.logo = this.DEFAULT_LOGO;

    integration.config = JSON.stringify(config);
    await this.integrationRepository.save(integration);

    this.generateAndSaveScript(integration, config);

    return integration;
  }

  private async generateAndSaveScript(integration: Integration, config: any) {
    const script = `(async () => {
      await import('${this.configService.get<string>('url.files')}/files/sofia-chat.min.js');
      const config = {
        id: '${integration.id}',
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

    const scriptPath = join(process.cwd(), 'uploads', 'chats', `CI${integration.id}.js`);

    fs.writeFileSync(scriptPath, script);
  }
}
