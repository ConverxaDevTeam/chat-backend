import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@modules/auth/auth.module';
import { Organization } from '@models/Organization.entity';
import { UserModule } from '@modules/user/user.module';
import { UserOrganization } from '@models/UserOrganization.entity';
import { UserOrganizationService } from './UserOrganization.service';
import { OrganizationSubscriber } from 'src/subscribers/organization.subscriber';

@Module({
  providers: [OrganizationService, UserOrganizationService, OrganizationSubscriber],
  controllers: [OrganizationController],
  imports: [TypeOrmModule.forFeature([Organization, UserOrganization]), forwardRef(() => AuthModule), forwardRef(() => UserModule)],
  exports: [OrganizationService, UserOrganizationService, TypeOrmModule.forFeature([Organization, UserOrganization])],
})
export class OrganizationModule {}
