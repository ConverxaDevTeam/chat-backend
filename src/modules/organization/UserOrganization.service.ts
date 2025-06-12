import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationRoleType, UserOrganization } from '@models/UserOrganization.entity';
import { Organization } from '@models/Organization.entity';
import { User } from '@models/User.entity';

@Injectable()
export class UserOrganizationService {
  constructor(
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  async create(data: { organization: Organization; user: User; role: OrganizationRoleType }): Promise<UserOrganization> {
    const userOrganization = new UserOrganization();
    userOrganization.organization = data.organization;
    userOrganization.user = data.user;
    userOrganization.role = data.role;
    return this.userOrganizationRepository.save(userOrganization);
  }

  async getMyOrganizations(user: User) {
    return this.userOrganizationRepository.find({
      where: {
        user: {
          id: user.id,
        },
      },
      relations: ['organization'],
    });
  }

  async getUserOrganization(user: User, organizationId: number): Promise<UserOrganization> {
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
        organization: {
          id: organizationId,
        },
      },
    });

    if (!userOrganization) {
      throw new NotFoundException('No perteneces a esta organización');
    }

    return userOrganization;
  }

  async searchUserInOrganization(user: User, organizationId: number): Promise<UserOrganization | null> {
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
        organization: {
          id: organizationId,
        },
      },
    });
    return userOrganization;
  }

  async updateUserRole(userId: number, organizationId: number, newRole: OrganizationRoleType): Promise<UserOrganization> {
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: {
        user: { id: userId },
        organization: { id: organizationId },
      },
      relations: ['user', 'organization'],
    });

    if (!userOrganization) {
      throw new NotFoundException('El usuario no pertenece a esta organización');
    }

    userOrganization.role = newRole;
    return this.userOrganizationRepository.save(userOrganization);
  }
}
