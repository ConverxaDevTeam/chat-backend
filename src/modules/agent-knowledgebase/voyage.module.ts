import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VoyageService } from './voyage.service';

@Module({
  imports: [ConfigModule],
  providers: [VoyageService],
  exports: [VoyageService],
})
export class VoyageModule {}
