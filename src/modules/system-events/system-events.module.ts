import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemEvent } from '@models/SystemEvent.entity';
import { SystemEventsService } from './system-events.service';
import { Funcion } from '@models/agent/Function.entity';
import { Conversation } from '@models/Conversation.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemEvent, Funcion, Conversation])],
  providers: [SystemEventsService],
  exports: [SystemEventsService],
})
export class SystemEventsModule {}
