import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../models/User.entity';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Session } from '@models/Session.entity';
import { UserController } from './user.controller';
import { OrganizationModule } from '@modules/organization/organization.module';
import { EmailModule } from '@modules/email/email.module';
import { OrganizationService } from '@modules/organization/organization.service';
import { Organization } from '@models/Organization.entity';
import { UserOrganization } from '@models/UserOrganization.entity';

@Module({
  providers: [UserService, OrganizationService],
  controllers: [UserController],
  imports: [
    TypeOrmModule.forFeature([User, Session, Organization, UserOrganization]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('access_token.secret'),
        signOptions: {
          expiresIn: config.get<string>('access_token.expiresIn'),
        },
      }),
    }),
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationModule),
    forwardRef(() => EmailModule),
  ],
  exports: [UserService],
})
export class UserModule {}
