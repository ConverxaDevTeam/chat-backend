import { Module, forwardRef } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@modules/auth/auth.module';
import { Organization } from '@models/Organization.entity';
import { UserModule } from '@modules/user/user.module';

@Module({
  providers: [OrganizationService],
  controllers: [OrganizationController],
  imports: [forwardRef(() => AuthModule), forwardRef(() => UserModule), TypeOrmModule.forFeature([Organization])],
  exports: [OrganizationService],
})
export class OrganizationModule {}
