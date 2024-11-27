import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@modules/auth/auth.module';
import { Organization } from '@models/Organization.entity';
import { UserModule } from '@modules/user/user.module';
import { UserOrganization } from '@models/UserOrganization.entity';
import { EmailService } from '@modules/email/email.service';
import { UserOrganizationService } from './UserOrganization.service';

@Module({
  providers: [OrganizationService, EmailService, UserOrganizationService],
  controllers: [OrganizationController],
  imports: [forwardRef(() => AuthModule), forwardRef(() => UserModule), TypeOrmModule.forFeature([Organization, UserOrganization])],
  exports: [OrganizationService],
})
export class OrganizationModule {}
