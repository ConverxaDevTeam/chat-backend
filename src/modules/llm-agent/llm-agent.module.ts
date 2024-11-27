import { Module } from '@nestjs/common';
import { LlmAgentController } from './llm-agent.controller';
import { LlmAgentService } from '../../services/llm-agent/llm-agent.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Chat } from '@models/Chat.entity';
import { Departamento } from '@models/Departamento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Chat, Departamento])],
  controllers: [LlmAgentController],
  providers: [LlmAgentService],
})
export class LlmAgentModule {}
