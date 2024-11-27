import { Organization } from '@models/Organization.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UserService } from '@modules/user/user.service';
import { EmailService } from '@modules/email/email.service';
import { UserOrganizationService } from './UserOrganization.service';
import { OrganizationRoleType } from '@models/UserOrganization.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly userOrganizationService: UserOrganizationService,
  ) {}

  async getAll(): Promise<Organization[]> {
    return this.organizationRepository.find({ relations: ['userOrganizations'] });
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
}
