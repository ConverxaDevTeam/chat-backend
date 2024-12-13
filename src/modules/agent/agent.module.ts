import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agentServer';
import { Agente } from '@models/agent/Agente.entity';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionCallService } from './function-call.service';
import { Conversation } from '@models/Conversation.entity';
import { SocketModule } from '@modules/socket/socket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agente, Funcion, Conversation]), forwardRef(() => SocketModule)],
  providers: [AgentService, FunctionCallService],
  exports: [AgentService, FunctionCallService],
})
export class AgentModule {}
