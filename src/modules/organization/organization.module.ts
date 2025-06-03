import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@modules/auth/auth.module';
import { Organization } from '@models/Organization.entity';
import { UserModule } from '../user/user.module';
import { UserOrganization } from '@models/UserOrganization.entity';
import { UserOrganizationService } from './UserOrganization.service';
import { OrganizationSubscriber } from 'src/subscribers/organization.subscriber';
import { EmailModule } from '@modules/email/email.module';
import { Agente } from '@models/agent/Agente.entity';
import { OrganizationLimit } from '@models/OrganizationLimit.entity';
import { OrganizationLimitService } from './organization-limit.service';
import { OrganizationLimitController } from './organization-limit.controller';

@Module({
  providers: [OrganizationService, UserOrganizationService, OrganizationSubscriber, OrganizationLimitService],
  controllers: [OrganizationController, OrganizationLimitController],
  imports: [TypeOrmModule.forFeature([Organization, UserOrganization, Agente, OrganizationLimit]), forwardRef(() => AuthModule), forwardRef(() => UserModule), EmailModule],
  exports: [OrganizationService, UserOrganizationService, OrganizationLimitService, TypeOrmModule.forFeature([Organization, UserOrganization, OrganizationLimit])],
})
export class OrganizationModule {}
