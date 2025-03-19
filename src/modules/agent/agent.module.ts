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
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { VoyageModule } from '@modules/agent-knowledgebase/voyage.module';
import { AgentKnowledgebaseModule } from '@modules/agent-knowledgebase/agent-knowledgebase.module';

@Module({
  imports: [
    VoyageModule,
    TypeOrmModule.forFeature([Agente, Funcion, Conversation]),
    forwardRef(() => SocketModule),
    SystemEventsModule,
    NotificationModule,
    forwardRef(() => IntegrationRouterModule),
    AgentKnowledgebaseModule,
  ],
  providers: [AgentService, FunctionCallService],
  exports: [AgentService, FunctionCallService],
})
export class AgentModule {}
