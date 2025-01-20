import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeController } from './node.controller';
import { NodeService } from './node.service';
import { Funcion } from '../../models/agent/Function.entity';
import { Agente } from '../../models/agent/Agente.entity';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion, Agente]), AuthModule],
  controllers: [NodeController],
  providers: [NodeService],
})
export class NodeModule {}
