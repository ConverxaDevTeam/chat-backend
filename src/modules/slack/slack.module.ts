import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '../user/user.module';
import { SlackService } from './slack.service';
import { SlackController } from './slack.controller';
import { IntegrationModule } from '@modules/integration/integration.module';
import { DepartmentModule } from '@modules/department/department.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '@models/Integration.entity';
import { Departamento } from '@models/Departamento.entity';
import { Organization } from '@models/Organization.entity';

import { ConversationModule } from '@modules/conversation/conversation.module';
import { MessageModule } from '@modules/message/message.module';
import { SocketModule } from '@modules/socket/socket.module';
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';

@Module({
  providers: [SlackService],
  controllers: [SlackController],
  imports: [
    TypeOrmModule.forFeature([Integration, Departamento, Organization]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => DepartmentModule),
    forwardRef(() => ConversationModule),
    forwardRef(() => MessageModule),
    forwardRef(() => SocketModule),
    forwardRef(() => IntegrationRouterModule),
  ],
  exports: [SlackService],
})
export class SlackModule {}
