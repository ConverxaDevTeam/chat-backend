import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Agente } from '@models/agent/Agente.entity';
import { AgentKnowledgebaseController } from './agent-knowledgebase.controller';
import { AgentKnowledgebaseService } from './agent-knowledgebase.service';
import { AuthModule } from '@modules/auth/auth.module';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBase, Agente]), AuthModule],
  controllers: [AgentKnowledgebaseController],
  providers: [AgentKnowledgebaseService, SofiaLLMService],
  exports: [AgentKnowledgebaseService],
})
export class AgentKnowledgebaseModule {}
