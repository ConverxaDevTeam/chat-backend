import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionCallService } from '@modules/agent/function-call.service';
import { Conversation } from '@models/Conversation.entity';
import { SocketModule } from '@modules/socket/socket.module';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion, Conversation]), forwardRef(() => SocketModule), NotificationModule],
  providers: [FunctionCallService],
  exports: [FunctionCallService],
})
export class FunctionCallModule {}
