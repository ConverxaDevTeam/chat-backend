import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';
import { IntegrationModule } from '@modules/integration/integration.module';
import { ConversationModule } from '@modules/conversation/conversation.module';
import { MessageModule } from '@modules/message/message.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agente } from '@models/agent/Agente.entity';
import { Funcion } from '@models/agent/Function.entity';
import { Conversation } from '@models/Conversation.entity';
import { OrganizationModule } from '@modules/organization/organization.module';
import { DepartmentModule } from '@modules/department/department.module';
import { Organization } from '@models/Organization.entity';
import { Departamento } from '@models/Departamento.entity';
import { LlmAgentModule } from '@modules/llm-agent/llm-agent.module';
import { DepartmentService } from '@modules/department/department.service';
import { SocketModule } from '@modules/socket/socket.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';
import { MessagerService } from './messager.service';
import { Integration } from '@models/Integration.entity';
import { WhatsAppService } from './whatsapp.service';

@Module({
  providers: [FacebookService, DepartmentService, MessagerService, WhatsAppService],
  controllers: [FacebookController],
  imports: [
    TypeOrmModule.forFeature([Agente, Funcion, Conversation, Organization, Departamento, Integration]),
    forwardRef(() => LlmAgentModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => ConversationModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => SocketModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => IntegrationRouterModule),
    forwardRef(() => MessageModule),
    IntegrationRouterModule,
  ],
  exports: [FacebookService, MessagerService, WhatsAppService],
})
export class FacebookModule {}
