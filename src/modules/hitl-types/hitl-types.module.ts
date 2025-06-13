import { Module } from '@nestjs/common';
import { HitlTypesController } from './hitl-types.controller';
import { CoreModule } from '@modules/core/core.module';

@Module({
  imports: [CoreModule],
  controllers: [HitlTypesController],
})
export class HitlTypesModule {}
