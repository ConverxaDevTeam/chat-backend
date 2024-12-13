import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agentServer';
import { Conversation } from '@models/Conversation.entity';
import { Funcion } from '@models/agent/Function.entity';
import { Agente } from '@models/agent/Agente.entity';
import { FunctionCallService } from './function-call.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Funcion, Agente])],
  providers: [AgentService, FunctionCallService],
  exports: [AgentService],
})
export class AgentModule {}
