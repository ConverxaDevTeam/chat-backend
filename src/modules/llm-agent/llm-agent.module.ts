import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Departamento } from '@models/Departamento.entity';
import { AgentManagerService } from 'src/services/llm-agent/agent-manager.service';
import { LlmAgentService } from 'src/services/llm-agent/llm-agent.service';
import { SocketModule } from '@modules/socket/socket.module';
import { AuthModule } from '@modules/auth/auth.module';
import { FunctionCallService } from 'src/services/function-call.service';
import { LlmAgentController } from './llm-agent.controller';
import { Funcion } from '@models/agent/Function.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Departamento, Funcion]), forwardRef(() => SocketModule), forwardRef(() => AuthModule)],
  controllers: [LlmAgentController],
  providers: [LlmAgentService, AgentManagerService, FunctionCallService],
  exports: [LlmAgentService, AgentManagerService],
})
export class LlmAgentModule {}
