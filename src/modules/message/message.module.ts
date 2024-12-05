import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '@models/Conversation.entity';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { Message } from '../../models/Message.entity';

@Module({
  providers: [MessageService],
  controllers: [MessageController],
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  exports: [MessageService],
})
export class MessageModule {}
