import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../../models/Message.entity';
import { Session } from '../../models/Session.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Funcion } from '@models/agent/Function.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { Organization } from '@models/Organization.entity';
import { ChatUser } from '@models/ChatUser.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatUser, Message, Session, Funcion, Organization]), AuthModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
