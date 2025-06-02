import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@models/Organization.entity';
import { User } from '@models/User.entity';
import { UserOrganization } from '@models/UserOrganization.entity';
import { EmailModule } from '@modules/email/email.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '@modules/user/user.module'; // For User entity if needed directly by PlanService
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User, UserOrganization]),
    AuthModule,
    EmailModule,
    ConfigModule,
    UserModule, // UserModule might provide UserService for user validation if needed
  ],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
