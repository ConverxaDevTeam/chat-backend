import { forwardRef, Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocketService } from './socket.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), forwardRef(() => AuthModule)],
  providers: [SocketGateway, SocketService],
  exports: [SocketService],
})
export class SocketModule {}
