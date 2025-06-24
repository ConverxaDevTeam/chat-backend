import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { UserModule } from '@modules/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationModule } from '@modules/organization/organization.module';
import { Integration } from '@models/Integration.entity';
import { DepartmentService } from '@modules/department/department.service';
import { Departamento } from '@models/Departamento.entity';
import { Organization } from '@models/Organization.entity';
import { ConversationModule } from '@modules/conversation/conversation.module';
import { SlackModule } from '@modules/slack/slack.module';

@Module({
  providers: [IntegrationService, DepartmentService],
  controllers: [IntegrationController],
  imports: [
    TypeOrmModule.forFeature([Integration, Departamento, Organization]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => ConversationModule),
    forwardRef(() => SlackModule),
  ],
  exports: [IntegrationService],
})
export class IntegrationModule {}
