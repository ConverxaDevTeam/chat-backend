import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Departamento } from '@models/Departamento.entity';
import { SocketModule } from '@modules/socket/socket.module';
import { LlmAgentController } from './llm-agent.controller';
import { Funcion } from '@models/agent/Function.entity';
import { Conversation } from '@models/Conversation.entity';
import { AgentModule } from '@modules/agent/agent.module';
import { AgentManagerModule } from '@modules/agent-manager/agent-manager.module';
import { LlmAgentService } from 'src/services/llm-agent/llm-agent.service';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { CoreModule } from '@modules/core/core.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agente, Departamento, Funcion, Conversation]),
    forwardRef(() => SocketModule),
    forwardRef(() => AgentModule),
    CoreModule,
    IntegrationRouterModule,
    forwardRef(() => FunctionCallModule),
    forwardRef(() => AgentManagerModule),
  ],
  controllers: [LlmAgentController],
  providers: [LlmAgentService],
  exports: [LlmAgentService],
})
export class LlmAgentModule {}
