import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketService } from './socket.service';
import { AuthModule } from '@modules/auth/auth.module';
import { AgentService } from 'src/services/agentServer';

@Module({
  imports: [TypeOrmModule.forFeature([]), forwardRef(() => AuthModule)],
  providers: [SocketGateway, SocketService, AgentService],
  exports: [SocketService],
})
export class SocketModule {}
