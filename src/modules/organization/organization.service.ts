import { Organization } from '@models/Organization.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async getAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: ['users'],
    });
  }
}
