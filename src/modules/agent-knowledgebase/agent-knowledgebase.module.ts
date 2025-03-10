import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Agente } from '@models/agent/Agente.entity';
import { AgentKnowledgebaseController } from './agent-knowledgebase.controller';
import { AgentKnowledgebaseService } from './agent-knowledgebase.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AgentManagerModule } from '@modules/agent-manager/agent-manager.module';
import { VoyageService } from './voyage.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBase, Agente]), AuthModule, AgentManagerModule],
  controllers: [AgentKnowledgebaseController],
  providers: [AgentKnowledgebaseService, VoyageService],
  exports: [AgentKnowledgebaseService],
})
export class AgentKnowledgebaseModule {}
