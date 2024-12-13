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

@Module({
  providers: [ConversationService, UserOrganizationService, DepartmentService],
  controllers: [ConversationController],
  imports: [
    TypeOrmModule.forFeature([Conversation, UserOrganization, Organization, Departamento]),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => ChatUserModule),
  ],
  exports: [ConversationService],
})
export class ConversationModule {}
