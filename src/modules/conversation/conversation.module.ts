import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { Conversation } from '@models/Conversation.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { OrganizationModule } from '@modules/organization/organization.module';
import { UserOrganizationService } from '@modules/organization/UserOrganization.service';
import { UserOrganization } from '@models/UserOrganization.entity';

@Module({
  providers: [ConversationService, UserOrganizationService],
  controllers: [ConversationController],
  imports: [TypeOrmModule.forFeature([Conversation, UserOrganization]), forwardRef(() => AuthModule), forwardRef(() => OrganizationModule)],
  exports: [ConversationService],
})
export class ConversationModule {}
