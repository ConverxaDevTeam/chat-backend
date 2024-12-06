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
        cors: ['http://localhost:4000'],
        sub_title: 'Prueba Aqui Sofia Chat',
        description: '¡Hola! Bienvenido a Sofia. Estoy aquí para ayudarte a encontrar respuestas y soluciones rápidamente.',
        logo: 'logo.png',
        horizontal_logo: 'horizontal-logo.png',
        icon_chat: 'icon-chat.png',
        icon_close: 'icon-close.png',
        edge_radius: '10',
        bg_color: '#15ECDA',
        bg_chat: '#F5F5F5',
        bg_user: '#ffffff',
        bg_assistant: '#b1f6f0',
        text_color: '#000000',
        text_date: '#969696',
        button_color: '#15ECDA',
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
    icon_chat: '${config.icon_chat}',
    icon_close: '${config.icon_close}',
    edge_radius: '${config.edge_radius}',
    bg_color: '${config.bg_color}',
    bg_chat: '${config.bg_chat}',
    bg_user: '${config.bg_user}',
    bg_assistant: '${config.bg_assistant}',
    text_color: '${config.text_color}',
    text_date: '${config.text_date}',
    button_color: '${config.button_color}',
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
}
