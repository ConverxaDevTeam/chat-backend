import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionController } from './function.controller';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionService } from 'src/services/function/function.service';
import { AuthModule } from '@modules/auth/auth.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion]), AuthModule, FunctionCallModule],
  controllers: [FunctionController],
  providers: [FunctionService],
  exports: [FunctionService],
})
export class FunctionModule {}
