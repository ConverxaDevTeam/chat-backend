import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
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
import { DepartmentModule } from './modules/department/department.module';
import { IntegrationModule } from '@modules/integration/integration.module';
import { FunctionModule } from '@modules/Function/function.module';
import { FunctionParamModule } from '@modules/function-param/function-param.module';
import { ChatUserModule } from '@modules/chat-user/chat-user.module';
import { ConversationModule } from '@modules/conversation/conversation.module';
import { MessageModule } from '@modules/message/message.module';
import { FacebookModule } from '@modules/facebook/facebook.module';
import { AutenticadorModule } from '@modules/Autenticador/autenticador.module';
import { AgentKnowledgebaseModule } from '@modules/agent-knowledgebase/agent-knowledgebase.module';
import { NodeModule } from './modules/node/node.module';
import { DashboardCardModule } from './modules/dashboard/dashboard-card.module';
import { AnalyticsModule } from '@modules/analytics/analytics.module';
import { FileModule } from './modules/file/file.module';
import { SlackModule } from '@modules/slack/slack.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { DataSource } from 'typeorm';
import { createKnowledgeBaseTableSQL } from '@models/agent/KnowledgeBaseDocument.entity';

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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'audio'),
      serveRoot: '/audio',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'images'),
      serveRoot: '/images',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'users'),
      serveRoot: '/users',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads', 'organizations'),
      serveRoot: '/organizations',
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
        migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
        migrationsRun: true,
        useUTC: true,
        timezone: 'UTC',
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
    FacebookModule,
    AutenticadorModule,
    AgentKnowledgebaseModule,
    NodeModule,
    DashboardCardModule,
    AnalyticsModule,
    FileModule,
    SlackModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {
    this.initializeVectorSupport();
  }

  // app.module.ts
  async initializeVectorSupport() {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
    await this.dataSource.query(createKnowledgeBaseTableSQL());
  }
}
