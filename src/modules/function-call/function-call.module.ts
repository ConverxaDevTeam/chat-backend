import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionCallService } from '@modules/agent/function-call.service';
import { Conversation } from '@models/Conversation.entity';
import { SocketModule } from '@modules/socket/socket.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { CoreModule } from '@modules/core/core.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion, Conversation]), forwardRef(() => SocketModule), CoreModule, forwardRef(() => IntegrationRouterModule), ChatUserModule],
  providers: [FunctionCallService],
  exports: [FunctionCallService],
})
export class FunctionCallModule {}
