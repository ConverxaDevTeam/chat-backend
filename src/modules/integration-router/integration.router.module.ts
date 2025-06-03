import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationRouterService } from './integration.router.service';
import { Conversation } from '@models/Conversation.entity';
import { AgentModule } from '@modules/agent/agent.module';
import { SocketModule } from '@modules/socket/socket.module';
import { IntegrationRouterController } from './integration.router.controller';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation]), forwardRef(() => AgentModule), forwardRef(() => SocketModule), forwardRef(() => AuthModule)],
  providers: [IntegrationRouterService],
  controllers: [IntegrationRouterController],
  exports: [IntegrationRouterService],
})
export class IntegrationRouterModule {}
