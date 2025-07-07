import { Organization, OrganizationType } from '@models/Organization.entity';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UserService } from '@modules/user/user.service';
import { UserOrganizationService } from './UserOrganization.service';
import { OrganizationRoleType, UserOrganization } from '@models/UserOrganization.entity';
import { User } from '@models/User.entity';
import { EmailService } from '../email/email.service';
import { FileService } from '@modules/file/file.service';
import { AgenteType } from 'src/interfaces/agent';
import { Agente } from '@models/agent/Agente.entity';
import { OrganizationLimitService } from './organization-limit.service';
import { OrganizationLimit } from '@models/OrganizationLimit.entity';
import { AllowedChangeRoleType } from '@modules/user/change-user-role.dto';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(Agente)
    private readonly agentRepository: Repository<Agente>,
    private readonly userService: UserService,
    private readonly userOrganizationService: UserOrganizationService,
    private readonly emailService: EmailService,
    private readonly fileService: FileService,
    private readonly organizationLimitService: OrganizationLimitService,
  ) {}

  async getAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: {
        userOrganizations: {
          user: true,
        },
        departamentos: {
          agente: true,
        },
      },
      select: {
        id: true,
        name: true,
        logo: true,
        description: true,
        type: true,
        userOrganizations: {
          id: true,
          role: true,
          user: {
            id: true,
            email: true,
          },
        },
        departamentos: {
          id: true,
          name: true,
          agente: {
            id: true,
            type: true,
          },
        },
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async createOrganization(createOrganizationDto: CreateOrganizationDto, file: Express.Multer.File, isSuperUser: boolean = false): Promise<Organization> {
    // Obtener el usuario por email
    const responseCreateUser = await this.userService.getUserForEmailOrCreate(createOrganizationDto.email);
    const user = responseCreateUser.user;

    // Si no es superusuario, verificar si ya tiene una organización
    if (!isSuperUser) {
      // Buscar todas las organizaciones donde el usuario es propietario (OWNER)
      const userOrganizations = await this.userOrganizationRepository.find({
        where: {
          user: { id: user.id },
          role: OrganizationRoleType.OWNER,
        },
        relations: ['organization'],
      });

      // Si ya tiene una organización, no permitir crear otra
      if (userOrganizations.length > 0) {
        throw new ConflictException('No puedes crear más de una organización. Contacta al administrador si necesitas ayuda.');
      }
    }

    // Crear la organización
    const organization = this.organizationRepository.create(createOrganizationDto);
    await this.organizationRepository.save(organization);

    // Guardar el logo
    const logoUrl = await this.fileService.saveFile(file, `organizations/${organization.id}`, 'logo');
    organization.logo = logoUrl;
    await this.organizationRepository.save(organization);

    // Asignar el usuario como propietario de la organización
    await this.userOrganizationService.create({
      organization,
      user: user,
      role: OrganizationRoleType.OWNER,
    });

    // Crear límites según el tipo de organización
    if (organization.type === OrganizationType.FREE || organization.type === OrganizationType.CUSTOM) {
      await this.createOrganizationLimits(organization);
    }

    // Enviar email de notificación
    // Si el usuario fue creado, ya se envió un email de bienvenida con la contraseña desde getUserForEmailOrCreate
    // Solo enviamos el email de nueva organización si el usuario ya existía
    if (!responseCreateUser.created) {
      await this.emailService.sendNewOrganizationEmail(user.email, 'Tu contraseña actual', organization.name);
    }
    return organization;
  }

  async getRolInOrganization(user: User, organizationId: number): Promise<OrganizationRoleType> {
    const userOrganization = await this.userOrganizationService.getUserOrganization(user, organizationId);
    return userOrganization.role;
  }

  async addUserInOrganizationById(organizationId: number, email: string): Promise<User> {
    const organization = await this.organizationRepository.findOne({ where: { id: organizationId } });

    if (!organization) {
      throw new NotFoundException('La organización no existe.');
    }

    const responseCreateUser = await this.userService.getUserForEmailOrCreate(email);

    const userOrganization = await this.userOrganizationService.searchUserInOrganization(responseCreateUser.user, organizationId);

    if (userOrganization) {
      throw new NotFoundException('El usuario ya pertenece a la organización.');
    }

    await this.userOrganizationService.create({
      organization,
      user: responseCreateUser.user,
      role: OrganizationRoleType.USER,
    });

    await this.emailService.sendNewOrganizationEmail(responseCreateUser.user.email, responseCreateUser.password ?? 'Tu contraseña actual', organization.name);

    return responseCreateUser.user;
  }

  async deleteOrganization(organizationId: number): Promise<void> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organización no encontrada');
    }

    await this.organizationRepository.softRemove(organization);
  }

  async setUserInOrganizationById(organizationId: number, userId: number): Promise<void> {
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organización no encontrada o inactiva');
    }

    await this.userOrganizationRepository.update(
      {
        organization: { id: organizationId },
        role: OrganizationRoleType.OWNER,
      },
      { user: { id: userId } },
    );
  }

  async updateLogo(id: number, file: Express.Multer.File): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({ where: { id } });
    if (!organization) throw new NotFoundException('Organization not found');

    const logoUrl = await this.fileService.saveFile(file, `organizations/${id}`, 'logo');

    organization.logo = logoUrl;
    return this.organizationRepository.save(organization);
  }

  async deleteLogo(organizationId: number): Promise<void> {
    await this.organizationRepository.update(organizationId, { logo: null });
  }

  async updateOrganization(organizationId: number, updateData: Partial<Organization>): Promise<Organization> {
    await this.organizationRepository.update(organizationId, updateData as any);
    return this.organizationRepository.findOneOrFail({ where: { id: organizationId } });
  }

  async updateAgentType(organizationId: number, agentType: AgenteType): Promise<void> {
    const agentes = await this.agentRepository
      .createQueryBuilder('agente')
      .innerJoin('agente.departamento', 'departamento')
      .innerJoin('departamento.organizacion', 'organization')
      .where('organization.id = :organizationId', { organizationId })
      .getMany();

    if (agentes.length > 0) {
      await this.agentRepository.update({ id: In(agentes.map((agente) => agente.id)) }, { type: agentType });
    }
  }

  /**
   * Crea límites para una organización según su tipo
   * @param organization Organización para la que se crearán los límites
   * @returns Límites creados o null si el tipo de organización no requiere límites
   */
  private async createOrganizationLimits(organization: Organization): Promise<OrganizationLimit | null> {
    return this.organizationLimitService.createDefaultLimitForOrganization(organization);
  }

  /**
   * Obtiene información sobre los límites de una organización
   * @param organizationId ID de la organización
   * @returns Información sobre los límites de la organización
   */
  async getOrganizationLimitInfo(organizationId: number) {
    return this.organizationLimitService.hasReachedConversationLimit(organizationId);
  }

  /**
   * Cambia el rol de un usuario en una organización
   * @param currentUser Usuario que solicita el cambio (debe ser OWNER)
   * @param organizationId ID de la organización
   * @param targetUserId ID del usuario al que se le cambiará el rol
   * @param newRole Nuevo rol a asignar (solo user o hitl)
   * @returns Usuario con rol actualizado
   */
  async changeUserRole(currentUser: User, organizationId: number, targetUserId: number, newRole: AllowedChangeRoleType): Promise<UserOrganization> {
    // Verificar que el usuario actual es OWNER de la organización
    const currentUserRole = await this.getRolInOrganization(currentUser, organizationId);
    if (currentUserRole !== OrganizationRoleType.OWNER) {
      throw new ForbiddenException('Solo los propietarios pueden cambiar roles de usuarios');
    }

    // Verificar que el usuario objetivo existe en la organización
    const targetUserOrg = await this.userOrganizationRepository.findOne({
      where: {
        user: { id: targetUserId },
        organization: { id: organizationId },
      },
      relations: ['user', 'organization'],
    });

    if (!targetUserOrg) {
      throw new NotFoundException('El usuario no pertenece a esta organización');
    }

    // Prevenir que el OWNER cambie su propio rol
    if (currentUser.id === targetUserId && currentUserRole === OrganizationRoleType.OWNER) {
      throw new BadRequestException('No puedes cambiar tu propio rol de propietario');
    }

    // Convertir el rol permitido a OrganizationRoleType para la base de datos
    const organizationRole = newRole === AllowedChangeRoleType.USER ? OrganizationRoleType.USER : OrganizationRoleType.HITL;

    // Actualizar el rol
    return this.userOrganizationService.updateUserRole(targetUserId, organizationId, organizationRole);
  }
}
