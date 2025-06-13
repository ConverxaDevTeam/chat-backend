import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatUserDataService } from './chat-user-data.service';
import { ChatUserData } from '@models/ChatUserData.entity';
import { ChatUser } from '@models/ChatUser.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatUserData, ChatUser])],
  providers: [ChatUserDataService],
  exports: [ChatUserDataService],
})
export class ChatUserDataModule {}
