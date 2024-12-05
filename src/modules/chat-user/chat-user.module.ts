import { Module } from '@nestjs/common';
import { ChatUserService } from './chat-user.service';
import { ChatUserController } from './chat-user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatUser } from '@models/ChatUser.entity';

@Module({
  providers: [ChatUserService],
  controllers: [ChatUserController],
  imports: [TypeOrmModule.forFeature([ChatUser])],
  exports: [ChatUserService],
})
export class ChatUserModule {}
