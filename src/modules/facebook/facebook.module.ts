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
import { IntegrationRouterModule } from '@modules/integration-router/integration.router.module';

@Module({
  providers: [FacebookService],
  controllers: [FacebookController],
  imports: [
    TypeOrmModule.forFeature([Agente, Funcion, Conversation]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
    forwardRef(() => IntegrationModule),
    forwardRef(() => ConversationModule),
    forwardRef(() => MessageModule),
    IntegrationRouterModule,
  ],
  exports: [FacebookService],
})
export class FacebookModule {}
