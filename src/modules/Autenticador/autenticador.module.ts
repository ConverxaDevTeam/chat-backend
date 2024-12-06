import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutenticadorController } from './autenticador.controller';
import { AutenticadorService } from './autenticador.service';
import { Autenticador } from '../../models/agent/Autenticador.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Autenticador])],
  controllers: [AutenticadorController],
  providers: [AutenticadorService],
  exports: [AutenticadorService],
})
export class AutenticadorModule {}
