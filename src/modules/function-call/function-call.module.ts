import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionCallService } from '@modules/agent/function-call.service';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion])],
  providers: [FunctionCallService],
  exports: [FunctionCallService],
})
export class FunctionCallModule {}
