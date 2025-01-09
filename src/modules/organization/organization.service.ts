import { Organization } from '@models/Organization.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UserService } from '@modules/user/user.service';
import { EmailService } from '@modules/email/email.service';
import { UserOrganizationService } from './UserOrganization.service';
import { OrganizationRoleType, UserOrganization } from '@models/UserOrganization.entity';
import { User } from '@models/User.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    private readonly userOrganizationService: UserOrganizationService,
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
    });
  }

  async createOrganization(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    const organization = new Organization();
    organization.name = createOrganizationDto.name;
    organization.description = createOrganizationDto.description;
    await this.organizationRepository.save(organization);

    const responseCreateUser = await this.userService.getUserForEmailOrCreate(createOrganizationDto.email);

    if (responseCreateUser.created && responseCreateUser.password) {
      await this.emailService.sendUserWellcome(createOrganizationDto.email, responseCreateUser.password);
    }

    await this.userOrganizationService.create({
      organization,
      user: responseCreateUser.user,
      role: OrganizationRoleType.OWNER,
    });

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

    if (responseCreateUser.created && responseCreateUser.password) {
      await this.emailService.sendUserWellcome(email, responseCreateUser.password);
    }

    const userOrganization = await this.userOrganizationService.searchUserInOrganization(responseCreateUser.user, organizationId);

    if (userOrganization) {
      throw new NotFoundException('El usuario ya pertenece a la organización.');
    }

    await this.userOrganizationService.create({
      organization,
      user: responseCreateUser.user,
      role: OrganizationRoleType.USER,
    });

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
}
