import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agentServer';
import { Agente } from '@models/agent/Agente.entity';
import { Funcion } from '@models/agent/Function.entity';
import { Conversation } from '@models/Conversation.entity';
import { SocketModule } from '@modules/socket/socket.module';
import { FunctionCallService } from './function-call.service';
import { SystemEventsModule } from '@modules/system-events/system-events.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Funcion, Conversation]), forwardRef(() => SocketModule), SystemEventsModule, NotificationModule],
  providers: [AgentService, FunctionCallService],
  exports: [AgentService, FunctionCallService],
})
export class AgentModule {}
