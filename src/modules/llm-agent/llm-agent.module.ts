import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Departamento } from '@models/Departamento.entity';
import { SocketModule } from '@modules/socket/socket.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LlmAgentController } from './llm-agent.controller';
import { Funcion } from '@models/agent/Function.entity';
import { Conversation } from '@models/Conversation.entity';
import { AgentModule } from '@modules/agent/agent.module';
import { AgentManagerService } from '@modules/agent-manager/agent-manager.service';
import { LlmAgentService } from 'src/services/llm-agent/llm-agent.service';
import { SystemEventsModule } from '@modules/system-events/system-events.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { HitlTypesModule } from '@modules/hitl-types/hitl-types.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agente, Departamento, Funcion, Conversation]),
    forwardRef(() => SocketModule),
    forwardRef(() => AuthModule),
    forwardRef(() => AgentModule),
    SystemEventsModule,
    IntegrationRouterModule,
    HitlTypesModule,
  ],
  controllers: [LlmAgentController],
  providers: [LlmAgentService, AgentManagerService],
  exports: [LlmAgentService, AgentManagerService],
})
export class LlmAgentModule {}
