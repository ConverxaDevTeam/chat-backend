import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardCardService } from './dashboard-card.service';
import { DashboardCardController } from './dashboard-card.controller';
import { DashboardCard } from '../../models/DashboardCard.entity';
import { UserOrganization } from '../../models/UserOrganization.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DashboardCard, UserOrganization]),
    AuthModule,
  ],
  controllers: [DashboardCardController],
  providers: [DashboardCardService],
})
export class DashboardCardModule {}
