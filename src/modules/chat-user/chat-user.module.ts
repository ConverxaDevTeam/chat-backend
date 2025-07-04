import { Module } from '@nestjs/common';
import { ChatUserService } from './chat-user.service';
import { ChatUserOptimizedService } from './chat-user-optimized.service';
import { ChatUserController } from './chat-user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatUser } from '@models/ChatUser.entity';
import { ChatUserDataModule } from '@modules/chat-user-data/chat-user-data.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserOrganization } from '@models/UserOrganization.entity';
import { Message } from '@models/Message.entity';
import { OrganizationModule } from '@modules/organization/organization.module';

@Module({
  providers: [ChatUserService, ChatUserOptimizedService],
  controllers: [ChatUserController],
  imports: [TypeOrmModule.forFeature([ChatUser, UserOrganization, Message]), ChatUserDataModule, AuthModule, OrganizationModule],
  exports: [ChatUserService, ChatUserOptimizedService],
})
export class ChatUserModule {}
