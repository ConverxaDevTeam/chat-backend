import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '@models/Conversation.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message } from '../../models/Message.entity';
import { ChatSession } from '@models/ChatSession.entity';
import { SessionService } from './session.service';
import { NotificationModule } from '../notification/notification.module';
import { AgentManagerModule } from '@modules/agent-manager/agent-manager.module';

@Module({
  providers: [MessageService, SessionService],
  controllers: [MessageController],
  imports: [TypeOrmModule.forFeature([Conversation, Message, ChatSession]), NotificationModule, AgentManagerModule],
  exports: [MessageService],
})
export class MessageModule {}
