import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionParamController } from '../../controllers/function-param/function-param.controller';
import { FunctionParamService } from '../../services/function-param/function-param.service';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionModule } from '@modules/Function/function.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion]), FunctionModule, AuthModule],
  controllers: [FunctionParamController],
  providers: [FunctionParamService],
  exports: [FunctionParamService],
})
export class FunctionParamModule {}
