import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { AgentManagerService } from './agent-manager.service';
import { SocketModule } from '@modules/socket/socket.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { CoreModule } from '@modules/core/core.module';

@Module({
  imports: [TypeOrmModule.forFeature([Agente]), forwardRef(() => SocketModule), forwardRef(() => FunctionCallModule), CoreModule, IntegrationRouterModule],
  providers: [AgentManagerService],
  exports: [AgentManagerService],
})
export class AgentManagerModule {}
