import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionParamController } from './function-param.controller';
import { FunctionParamService } from '../../services/function-param/function-param.service';
import { Funcion } from '../../models/agent/Function.entity';
import { FunctionModule } from '../Function/function.module';
import { FunctionUtilsService } from '../../services/function/functionUtils.service';
import { AuthModule } from '@modules/auth/auth.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion]), FunctionModule, AuthModule, FunctionCallModule],
  controllers: [FunctionParamController],
  providers: [FunctionParamService, FunctionUtilsService],
  exports: [FunctionParamService],
})
export class FunctionParamModule {}
