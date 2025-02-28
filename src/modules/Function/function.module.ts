import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionController } from './function.controller';
import { Funcion } from '../../models/agent/Function.entity';
import { FunctionService } from '../../services/function/function.service';
import { AuthModule } from '@modules/auth/auth.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';
import { FunctionUtilsService } from 'src/services/function/functionUtils.service';
import { SystemEventsModule } from '../system-events/system-events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion]), SystemEventsModule, AuthModule, FunctionCallModule],
  controllers: [FunctionController],
  providers: [FunctionService, FunctionUtilsService],
  exports: [FunctionService],
})
export class FunctionModule {}
