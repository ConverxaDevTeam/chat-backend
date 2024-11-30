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
      },
    });

    if (!integration) {
      const newIntegration = new Integration();
      newIntegration.type = IntegrationType.CHAT_WEB;

      const config = {
        title: 'Sofia Chat',
        sub_title: 'Prueba Aqui Sofia Chat',
        description: '¡Hola! Bienvenido a Sofia. Estoy aquí para ayudarte a encontrar respuestas y soluciones rápidamente.',
        logo: 'logo.png',
        horizontal_logo: 'horizontal-logo.png',
        icon_chat: 'icon-chat.png',
        icon_close: 'icon-close.png',
      };
      newIntegration.config = JSON.stringify(config);
      newIntegration.departamento = departamento;
      await this.integrationRepository.save(newIntegration);

      const script = `(async () => {
  const sofiaChat = await import('${this.configService.get<string>('url.files')}/files/sofia-chat.js');
  const config = {
    id: '${newIntegration.id}',
    title: '${config.title}',
    sub_title: '${config.sub_title}',
    description: '${config.description}',
    logo: '${this.configService.get<string>('url.files')}/logos/${config.logo}',
    horizontal_logo: '${this.configService.get<string>('url.files')}/logos/${config.horizontal_logo}',
    icon_chat: '${this.configService.get<string>('url.files')}/assets/${config.icon_chat}',
    icon_close: '${this.configService.get<string>('url.files')}/assets/${config.icon_close}',
  };
  sofiaChat.default.init(config);
})();
`;

      const scriptPath = join(process.cwd(), 'uploads', 'chats', `sofia-chat-${newIntegration.id}.js`);

      fs.writeFileSync(scriptPath, script);

      return newIntegration;
    }
    return integration;
  }
}
