import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunctionController } from './function.controller';
import { Funcion } from '../../models/agent/Function.entity';
import { Agente } from '../../models/agent/Agente.entity';
import { FunctionService } from '../../services/function/function.service';
import { AuthModule } from '@modules/auth/auth.module';
import { FunctionCallModule } from '@modules/function-call/function-call.module';
import { FunctionUtilsService } from 'src/services/function/functionUtils.service';
import { SystemEventsModule } from '../system-events/system-events.module';
import { AgentManagerModule } from '@modules/agent-manager/agent-manager.module';

@Module({
  imports: [TypeOrmModule.forFeature([Funcion, Agente]), SystemEventsModule, AuthModule, FunctionCallModule, forwardRef(() => AgentManagerModule)],
  controllers: [FunctionController],
  providers: [FunctionService, FunctionUtilsService],
  exports: [FunctionService],
})
export class FunctionModule {}
