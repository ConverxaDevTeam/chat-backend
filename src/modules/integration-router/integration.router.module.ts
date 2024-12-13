import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationRouterService } from './integration.router.service';
import { Conversation } from '@models/Conversation.entity';
import { AgentModule } from '@modules/agent/agent.module';
import { SocketModule } from '@modules/socket/socket.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation]), AgentModule, forwardRef(() => SocketModule)],
  providers: [IntegrationRouterService],
  exports: [IntegrationRouterService],
})
export class IntegrationRouterModule {}
