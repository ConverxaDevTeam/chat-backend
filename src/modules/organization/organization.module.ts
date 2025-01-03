import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@modules/auth/auth.module';
import { Organization } from '@models/Organization.entity';
import { UserModule } from '@modules/user/user.module';
import { UserOrganization } from '@models/UserOrganization.entity';
import { UserOrganizationService } from './UserOrganization.service';
import { EmailModule } from '@modules/email/email.module';

@Module({
  providers: [OrganizationService, UserOrganizationService],
  controllers: [OrganizationController],
  imports: [forwardRef(() => AuthModule), forwardRef(() => UserModule), forwardRef(() => EmailModule), TypeOrmModule.forFeature([Organization, UserOrganization])],
  exports: [OrganizationService, UserOrganizationService],
})
export class OrganizationModule {}
