import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway, WebChatSocketGateway } from './socket.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketService } from './socket.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AgentService } from 'src/services/agentServer';
import { Agente } from '@models/agent/Agente.entity';
import { LlmAgentModule } from '@modules/llm-agent/llm-agent.module';
import { IntegrationModule } from '@modules/integration/integration.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';
import { ConversationModule } from '@modules/conversation/conversation.module';
import { DepartmentModule } from '@modules/department/department.module';
import { MessageModule } from '@modules/message/message.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agente]),
    forwardRef(() => AuthModule),
    forwardRef(() => LlmAgentModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => ChatUserModule),
    forwardRef(() => ConversationModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => MessageModule),
  ],
  providers: [SocketGateway, SocketService, AgentService, WebChatSocketGateway],
  exports: [SocketService],
})
export class SocketModule {}
