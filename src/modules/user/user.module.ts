import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../models/User.entity';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SessionService } from '@modules/auth/session.service';
import { Session } from '@models/Session.entity';
import { UserController } from './user.controller';
import { EmailService } from './email.service';

@Module({
  providers: [UserService, AuthService, JwtService, SessionService, EmailService],
  controllers: [UserController],
  imports: [
    TypeOrmModule.forFeature([User, Session]),
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
  ],
  exports: [UserService, EmailService],
})
export class UserModule {}
