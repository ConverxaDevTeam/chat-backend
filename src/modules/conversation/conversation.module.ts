import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { Conversation } from '@models/Conversation.entity';

@Module({
  providers: [ConversationService],
  controllers: [ConversationController],
  imports: [TypeOrmModule.forFeature([Conversation])],
  exports: [ConversationService],
})
export class ConversationModule {}
