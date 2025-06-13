import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HitlTypesService } from '@modules/hitl-types/hitl-types.service';
import { HitlType } from '@models/HitlType.entity';
import { UserHitlType } from '@models/UserHitlType.entity';
import { User } from '@models/User.entity';
import { SystemEventsModule } from '@modules/system-events/system-events.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HitlType, UserHitlType, User]), EventEmitterModule.forRoot(), SystemEventsModule, NotificationModule, AuthModule],
  providers: [HitlTypesService],
  exports: [HitlTypesService, SystemEventsModule, NotificationModule, AuthModule, EventEmitterModule],
})
export class CoreModule {}
