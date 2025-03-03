import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { AgentManagerService } from './agent-manager.service';
import { SocketModule } from '@modules/socket/socket.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';
import { SystemEventsModule } from '@modules/system-events/system-events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agente]), SocketModule, FunctionCallModule, SystemEventsModule],
  providers: [AgentManagerService],
  exports: [AgentManagerService],
})
export class AgentManagerModule {}
