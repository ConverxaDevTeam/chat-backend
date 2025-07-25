import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { Conversation } from '@models/Conversation.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { OrganizationModule } from '@modules/organization/organization.module';
import { UserOrganizationService } from '@modules/organization/UserOrganization.service';
import { UserOrganization } from '@models/UserOrganization.entity';
import { DepartmentModule } from '@modules/department/department.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';
import { Organization } from '@models/Organization.entity';
import { Departamento } from '@models/Departamento.entity';
import { DepartmentService } from '@modules/department/department.service';
import { NotificationModule } from '@modules/notification/notification.module';
import { Notification } from '@models/notification.entity';
import { OrganizationLimitService } from '@modules/organization/organization-limit.service';
import { OrganizationLimit } from '@models/OrganizationLimit.entity';
import { UserHitlType } from '@models/UserHitlType.entity';

@Module({
  providers: [ConversationService, UserOrganizationService, DepartmentService, OrganizationLimitService],
  controllers: [ConversationController],
  imports: [
    TypeOrmModule.forFeature([Conversation, UserOrganization, Organization, Departamento, Notification, OrganizationLimit, UserHitlType]),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => ChatUserModule),
    NotificationModule,
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
