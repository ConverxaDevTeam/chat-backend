import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '@models/Conversation.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message } from '../../models/Message.entity';
import { ChatSession } from '@models/ChatSession.entity';
import { SessionService } from './session.service';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  providers: [MessageService, SessionService, SofiaLLMService],
  controllers: [MessageController],
  imports: [TypeOrmModule.forFeature([Conversation, Message, ChatSession]), NotificationModule],
  exports: [MessageService],
})
export class MessageModule {}
