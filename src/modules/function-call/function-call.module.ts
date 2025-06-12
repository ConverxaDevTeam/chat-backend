import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionCallService } from '@modules/agent/function-call.service';
import { Conversation } from '@models/Conversation.entity';
import { SocketModule } from '@modules/socket/socket.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { SystemEventsModule } from '@modules/system-events/system-events.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { HitlTypesModule } from '@modules/hitl-types/hitl-types.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Funcion, Conversation]),
    forwardRef(() => SocketModule),
    forwardRef(() => AuthModule),
    NotificationModule,
    SystemEventsModule,
    forwardRef(() => IntegrationRouterModule),
    HitlTypesModule,
    ChatUserModule,
  ],
  providers: [FunctionCallService],
  exports: [FunctionCallService],
})
export class FunctionCallModule {}
