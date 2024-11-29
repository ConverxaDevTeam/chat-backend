import { Module } from '@nestjs/common';
import { LlmAgentController } from './llm-agent.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Chat } from '@models/Chat.entity';
import { Departamento } from '@models/Departamento.entity';
import { AgentManagerService } from 'src/services/llm-agent/agent-manager.service';
import { LlmAgentService } from 'src/services/llm-agent/llm-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Chat, Departamento])],
  controllers: [LlmAgentController],
  providers: [LlmAgentService, AgentManagerService],
  exports: [LlmAgentService, AgentManagerService],
})
export class LlmAgentModule {}
