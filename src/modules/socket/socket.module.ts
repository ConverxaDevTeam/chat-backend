import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway, WebChatSocketGateway } from './socket.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketService } from './socket.service';
import { AuthModule } from '@modules/auth/auth.module';
import { LlmAgentModule } from '@modules/llm-agent/llm-agent.module';
import { IntegrationModule } from '@modules/integration/integration.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';
import { ConversationModule } from '@modules/conversation/conversation.module';
import { DepartmentModule } from '@modules/department/department.module';
import { MessageModule } from '@modules/message/message.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { AgentModule } from '@modules/agent/agent.module';
import { UserOrganization } from '@models/UserOrganization.entity';
import { Conversation } from '@models/Conversation.entity';
import { FacebookModule } from '@modules/facebook/facebook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, UserOrganization]),
    forwardRef(() => AuthModule),
    forwardRef(() => LlmAgentModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => ChatUserModule),
    forwardRef(() => ConversationModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => MessageModule),
    forwardRef(() => FunctionCallModule),
    forwardRef(() => IntegrationRouterModule),
    forwardRef(() => FacebookModule),
    forwardRef(() => AgentModule),
  ],
  providers: [SocketGateway, SocketService, WebChatSocketGateway],
  exports: [SocketService],
})
export class SocketModule {}
