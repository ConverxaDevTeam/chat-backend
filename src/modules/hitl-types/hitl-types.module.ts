import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HitlTypesService } from './hitl-types.service';
import { HitlTypesController } from './hitl-types.controller';
import { HitlType } from '@models/HitlType.entity';
import { UserHitlType } from '@models/UserHitlType.entity';
import { User } from '@models/User.entity';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HitlType, UserHitlType, User]), AuthModule],
  controllers: [HitlTypesController],
  providers: [HitlTypesService],
  exports: [HitlTypesService],
})
export class HitlTypesModule {}
