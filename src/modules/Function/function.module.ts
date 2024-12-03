import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionController } from './function.controller';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionService } from 'src/services/function/function.service';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion])],
  controllers: [FunctionController],
  providers: [FunctionService],
  exports: [FunctionService],
})
export class FunctionModule {}
