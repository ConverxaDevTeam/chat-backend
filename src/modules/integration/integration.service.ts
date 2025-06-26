import { Integration, IntegrationType } from '@models/Integration.entity';
import { User } from '@models/User.entity';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { DepartmentService } from '@modules/department/department.service';
import { OrganizationService } from '@modules/organization/organization.service';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Departamento } from '@models/Departamento.entity';
import { UpdateIntegrationWebChatDataDto } from './dto/update-integration-web-chat.dto';
import { CreateIntegrationWhatsAppDto } from '@modules/facebook/dto/create-integration-whats-app.dto';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FileService } from '@modules/file/file.service';
import { ConversationService } from '../conversation/conversation.service';
import { SlackService } from '@modules/slack/slack.service';
import { UpdateIntegrationMessengerManualDto } from '@modules/facebook/dto/update-integration-messager-manual.dto';
import { UpdateIntegrationWhatsAppManualDto } from '@modules/facebook/dto/update-integration-whatsapp-manual.dto';

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
    private readonly conversationService: ConversationService,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => SlackService))
    private readonly slackService: SlackService,
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
        name: 'CONVERXA',
        title: 'CONVERXA CHAT',
        cors: [],
        sub_title: 'Descubre todo lo que SOFIA puede hacer por ti.',
        description: '¡Hola y bienvenido a SOFIA! Estoy aquí para ayudarte a encontrar respuestas y soluciones de manera rápida y sencilla. ¿En qué puedo asistirte hoy?',
        logo: this.DEFAULT_LOGO,
        horizontal_logo: 'horizontal-logo.svg',
        edge_radius: '10',
        message_radius: '4',
        bg_color: '#DBEAF2',
        bg_chat: '#fff',
        bg_user: '#343E4F',
        bg_assistant: '#F6F6F6',
        text_color: '#000000',
        text_title: '#000000',
        text_date: '#969696',
        button_color: '#15ECDA',
        button_text: '#15ECDA',
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
    // Usar getDepartmentById en lugar de getDepartamentoById para cargar la relación completa con la organización
    const departamento = await this.departmentService.getDepartmentById(id);
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
      .andWhere('integration.type IN (:...types)', { types: [IntegrationType.MESSENGER_MANUAL, IntegrationType.MESSENGER] })
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
    const integration = await this.integrationRepository
      .createQueryBuilder('integration')
      .select(['integration.id', 'integration.token', 'integration.waba_id', 'integration.phone_number_id'])
      .leftJoinAndSelect('integration.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .where('integration.waba_id = :waba_id', { waba_id })
      .andWhere('integration.type IN (:...types)', { types: [IntegrationType.WHATSAPP, IntegrationType.WHATSAPP_MANUAL] })
      .getOne();
    return integration;
  }

  async updateIntegrationLogo(user: User, integrationId: number, file: Express.Multer.File): Promise<Integration> {
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

    try {
      const logoUrl = await this.fileService.saveFile(file, `users/${user.id}`, `integration_${integrationId}_avatar`);
      config.logo = logoUrl;

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
    // Preparamos la configuración del cliente como un objeto JavaScript
    const clientConfig = {
      id: integration.id,
      url: this.configService.get<string>('url.wss'),
      url_assets: this.configService.get<string>('url.files'),
      name: config.name || '',
      title: config.title || '',
      sub_title: config.sub_title || '',
      description: config.description || '',
      logo: config.logo || '',
      horizontal_logo: config.horizontal_logo || '',
      edge_radius: config.edge_radius || '',
      message_radius: config.message_radius || '',
      bg_color: config.bg_color || '',
      bg_chat: config.bg_chat || '',
      bg_user: config.bg_user || '',
      bg_assistant: config.bg_assistant || '',
      text_color: config.text_color || '',
      text_title: config.text_title || '',
      text_date: config.text_date || '',
      button_color: config.button_color || '',
      button_text: config.button_text || '',
    };

    // Convertimos la configuración a JSON y la insertamos directamente en el script
    // Esto garantiza que todos los caracteres espeoeciales y saltos de línea se manejen correctamente
    const configJson = JSON.stringify(clientConfig);

    // Generamos el script con la configuración ya serializada
    const script = `(async () => {
      await import('${this.configService.get<string>('url.files')}/files/converxa-chat.min.js');
      const config = ${configJson};
      ConverxaChat.default.init(config);
    })();
`;

    const scriptPath = join(process.cwd(), 'uploads', 'chats', `CI${integration.id}.js`);

    fs.writeFileSync(scriptPath, script);
  }

  async deleteIntegrationById(user: User, integrationId: number): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { id: integrationId },
      relations: ['conversations'], // Cargar relaciones si es necesario
      select: ['id', 'type', 'slack_channel_id', 'token'],
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    if (integration.conversations && integration.conversations.length > 0) {
      await this.conversationService.removeIntegrationRelationships(integration.id);
    }

    if (integration.type === IntegrationType.SLACK) {
      await this.slackService.archiveChannel(integration.slack_channel_id, integration.token);
    }

    await this.integrationRepository.remove(integration);

    return integration;
  }

  async createIntegrationSlack(
    departamento: Departamento,
    data: {
      authed_user_id: string;
      access_token: string;
      team_id: string;
      team_name: string;
      refresh_token: string;
      bot_user_id: string;
      channel_id: string;
      channel_name: string;
    },
  ): Promise<Integration> {
    const newIntegration = new Integration();
    newIntegration.type = IntegrationType.SLACK;
    newIntegration.departamento = departamento;
    newIntegration.authed_user_id = data.authed_user_id;
    newIntegration.token = data.access_token;
    newIntegration.team_id = data.team_id;
    newIntegration.team_name = data.team_name;
    newIntegration.refresh_token = data.refresh_token;
    newIntegration.bot_user_id = data.bot_user_id;
    newIntegration.slack_channel_id = data.channel_id;
    newIntegration.slack_channel_name = data.channel_name;

    await this.integrationRepository.save(newIntegration);

    return newIntegration;
  }

  async getChannelNameByIntegrationId(user: User, organizationId: number, departamentoId: number, integrationId: number): Promise<string> {
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
        id: integrationId,
        departamento: { id: departamentoId },
        type: IntegrationType.SLACK,
      },
      select: ['id', 'slack_channel_name'],
    });

    if (!integration) {
      throw new Error(`La integración con ID ${integrationId} no existe en el departamento con ID ${departamentoId}`);
    }
    return integration.slack_channel_name;
  }

  async changeChannelNameSlack(user: User, organizationId: number, departamentoId: number, integrationId: number, channelName: string): Promise<Integration> {
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
        id: integrationId,
        departamento: { id: departamentoId },
        type: IntegrationType.SLACK,
      },
      select: ['id', 'slack_channel_name', 'slack_channel_id', 'token'],
    });

    if (!integration) {
      throw new Error(`La integración con ID ${integrationId} no existe en el departamento con ID ${departamentoId}`);
    }
    const response = await this.slackService.renameSlackChannel(integration.slack_channel_id, channelName, integration.token);

    if (!response) {
      throw new Error('Error al renombrar canal');
    }

    integration.slack_channel_name = channelName;
    await this.integrationRepository.save(integration);

    return integration;
  }

  async getIntegrationBychannelId(channelId: string): Promise<Integration | null> {
    const integration = await this.integrationRepository
      .createQueryBuilder('integration')
      .addSelect('integration.token')
      .addSelect('integration.page_id')
      .addSelect('integration.config')
      .addSelect('integration.slack_channel_id')
      .addSelect('integration.token')
      .leftJoinAndSelect('integration.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .where('integration.slack_channel_id = :channelId', { channelId })
      .andWhere('integration.type = :type', { type: IntegrationType.SLACK })
      .getOne();

    return integration;
  }

  async createIntegrationManual(user: User, organizationId: number, departamentoId: number, type: IntegrationType): Promise<Integration> {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);

    const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
    if (!allowedRoles.includes(rolInOrganization)) {
      throw new Error('No tienes permisos para obtener la integración');
    }

    const departamento = await this.departmentService.getDepartmentByOrganizationAndDepartmentId(organizationId, departamentoId);

    if (!departamento) {
      throw new Error(`El departamento con ID ${departamentoId} no existe en la organización con ID ${organizationId}`);
    }

    const newIntegration = new Integration();
    newIntegration.type = type;
    newIntegration.departamento = departamento;
    newIntegration.code_webhook = this.generateRandomCode(30);
    return await this.integrationRepository.save(newIntegration);
  }

  generateRandomCode(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  async getIntegrationMessengerManual(user: User, organizationId: number, departamentoId: number, id: number): Promise<Integration> {
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
        id,
        departamento: { id: departamentoId },
        type: IntegrationType.MESSENGER_MANUAL,
      },
      select: ['id', 'code_webhook', 'page_id', 'token', 'validated_webhook'],
    });

    if (!integration) {
      throw new Error(`La integración con ID ${id} no existe en el departamento con ID ${departamentoId}`);
    }

    return integration;
  }

  async getIntegrationWhatsAppManual(user: User, organizationId: number, departamentoId: number, id: number): Promise<Integration> {
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
        id,
        departamento: { id: departamentoId },
        type: IntegrationType.WHATSAPP_MANUAL,
      },
      select: ['id', 'code_webhook', 'phone_number_id', 'token', 'validated_webhook', 'waba_id'],
    });

    if (!integration) {
      throw new Error(`La integración con ID ${id} no existe en el departamento con ID ${departamentoId}`);
    }

    return integration;
  }

  async changeCodeIntegrationManual(user: User, organizationId: number, departamentoId: number, id: number): Promise<string> {
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
        id,
        departamento: { id: departamentoId },
        type: In([IntegrationType.MESSENGER_MANUAL, IntegrationType.WHATSAPP_MANUAL]),
      },
      select: ['id', 'code_webhook'],
    });

    if (!integration) {
      throw new Error(`La integración con ID ${id} no existe en el departamento con ID ${departamentoId}`);
    }

    integration.code_webhook = this.generateRandomCode(30);
    integration.validated_webhook = false;
    await this.integrationRepository.save(integration);

    return integration.code_webhook;
  }

  async getIntegrationCodeById(id: number): Promise<string> {
    const integration = await this.integrationRepository.findOne({
      where: {
        id,
        type: In([IntegrationType.MESSENGER_MANUAL, IntegrationType.WHATSAPP_MANUAL]),
      },
      select: ['id', 'code_webhook'],
    });

    if (!integration) {
      throw new Error(`La integración con ID ${id} no existe`);
    }

    return integration.code_webhook;
  }

  async validateCodeIntegrationManual(id: number, code: string): Promise<boolean> {
    const integration = await this.integrationRepository.findOne({
      where: {
        id,
        type: In([IntegrationType.MESSENGER_MANUAL, IntegrationType.WHATSAPP_MANUAL]),
        code_webhook: code,
      },
      select: ['id', 'code_webhook'],
    });

    if (!integration) {
      return false;
    }

    integration.validated_webhook = true;
    await this.integrationRepository.save(integration);

    return true;
  }

  async updateIntegrationMessengerManual(
    user: User,
    organizationId: number,
    departamentoId: number,
    id: number,
    updateIntegrationMessengerManualDto: UpdateIntegrationMessengerManualDto,
  ): Promise<Integration> {
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
        id,
        departamento: { id: departamentoId },
        type: IntegrationType.MESSENGER_MANUAL,
      },
    });

    if (!integration) {
      throw new Error(`La integración con ID ${id} no existe en el departamento con ID ${departamentoId}`);
    }

    integration.page_id = updateIntegrationMessengerManualDto.page_id;
    integration.token = updateIntegrationMessengerManualDto.token;
    await this.integrationRepository.save(integration);

    return integration;
  }

  async updateIntegrationWhatsAppManual(
    user: User,
    organizationId: number,
    departamentoId: number,
    id: number,
    updateIntegrationWhatsAppManualDto: UpdateIntegrationWhatsAppManualDto,
  ): Promise<Integration> {
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
        id,
        departamento: { id: departamentoId },
        type: IntegrationType.WHATSAPP_MANUAL,
      },
    });

    if (!integration) {
      throw new Error(`La integración con ID ${id} no existe en el departamento con ID ${departamentoId}`);
    }

    integration.waba_id = updateIntegrationWhatsAppManualDto.waba_id;
    integration.phone_number_id = updateIntegrationWhatsAppManualDto.phone_number_id;
    integration.token = updateIntegrationWhatsAppManualDto.token;
    await this.integrationRepository.save(integration);

    return integration;
  }
}
