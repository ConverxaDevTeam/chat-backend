import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketService } from './socket.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AgentService } from 'src/services/agentServer';
import { Agente } from '@models/agent/Agente.entity';
import { Funcion } from '@models/agent/Function.entity';
import { LlmAgentModule } from '@modules/llm-agent/llm-agent.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Funcion]), forwardRef(() => AuthModule), forwardRef(() => LlmAgentModule)],
  providers: [SocketGateway, SocketService, AgentService],
  exports: [SocketService],
})
export class SocketModule {}
