import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '@models/Conversation.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message } from '../../models/Message.entity';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';

@Module({
  providers: [MessageService, SofiaLLMService],
  controllers: [MessageController],
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  exports: [MessageService],
})
export class MessageModule {}
