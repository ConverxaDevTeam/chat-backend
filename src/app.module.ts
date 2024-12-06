import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { join } from 'path';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { ConfigModuleOptions } from './config/options';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationModule } from '@modules/organization/organization.module';
import { SocketModule } from '@modules/socket/socket.module';
import { EmailModule } from '@modules/email/email.module';
import { LlmAgentModule } from './modules/llm-agent/llm-agent.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { DepartmentModule } from './modules/department/department.module';
import { IntegrationModule } from '@modules/integration/integration.module';
import { FunctionModule } from '@modules/Function/function.module';
import { FunctionParamModule } from '@modules/function-param/function-param.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';
import { ConversationModule } from '@modules/conversation/conversation.module';
import { MessageModule } from '@modules/message/message.module';
import { AutenticadorModule } from '@modules/Autenticador/autenticador.module';

@Module({
  imports: [
    ConfigModule.forRoot(ConfigModuleOptions),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'assets'),
      serveRoot: '/assets',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'chats'),
      serveRoot: '/sofia-chat',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'logos'),
      serveRoot: '/logos',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'scripts'),
      serveRoot: '/files',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number | undefined>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.pass'),
        database: configService.get<string>('database.name'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: true,
        force: true,
      }),
    }),
    UserModule,
    AuthModule,
    OrganizationModule,
    SocketModule,
    EmailModule,
    LlmAgentModule,
    DepartmentModule,
    IntegrationModule,
    ChatUserModule,
    ConversationModule,
    MessageModule,
    FunctionModule,
    FunctionParamModule,
    AutenticadorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
