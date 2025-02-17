import { Organization } from '@models/Organization.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UserService } from '@modules/user/user.service';
import { UserOrganizationService } from './UserOrganization.service';
import { OrganizationRoleType, UserOrganization } from '@models/UserOrganization.entity';
import { User } from '@models/User.entity';
import { EmailService } from '../email/email.service';
import { FileService } from '@modules/file/file.service';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly userService: UserService,
    private readonly userOrganizationService: UserOrganizationService,
    private readonly emailService: EmailService,
    private readonly fileService: FileService,
  ) {}

  async getAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: {
        userOrganizations: {
          user: true,
        },
      },
      select: {
        id: true,
        name: true,
        logo: true,
        description: true,
        userOrganizations: {
          id: true,
          role: true,
          user: {
            id: true,
            email: true,
          },
        },
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async createOrganization(createOrganizationDto: CreateOrganizationDto, file: Express.Multer.File): Promise<Organization> {
    const organization = new Organization();
    organization.name = createOrganizationDto.name;
    organization.description = createOrganizationDto.description;
    await this.organizationRepository.save(organization);

    const logoUrl = await this.fileService.saveFile(file, `organizations/${organization.id}`, 'logo');
    organization.logo = logoUrl;
    await this.organizationRepository.save(organization);

    const responseCreateUser = await this.userService.getUserForEmailOrCreate(createOrganizationDto.email);

    await this.userOrganizationService.create({
      organization,
      user: responseCreateUser.user,
      role: OrganizationRoleType.OWNER,
    });
    await this.emailService.sendNewOrganizationEmail(responseCreateUser.user.email, responseCreateUser.user.password, organization.name);

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

    if (responseCreateUser.password) {
      await this.emailService.sendNewOrganizationEmail(responseCreateUser.user.email, responseCreateUser.password, organization.name);
    }

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
}
