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
import { AgentManagerService } from 'src/services/llm-agent/agent-manager.service';
import { LlmAgentService } from 'src/services/llm-agent/llm-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Departamento, Funcion, Conversation]), forwardRef(() => SocketModule), forwardRef(() => AuthModule), forwardRef(() => AgentModule)],
  controllers: [LlmAgentController],
  providers: [LlmAgentService, AgentManagerService],
  exports: [LlmAgentService, AgentManagerService],
})
export class LlmAgentModule {}
