import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../models/User.entity';
import { Session } from '@models/Session.entity';
import { SessionService } from './session.service';
import { EmailModule } from '@modules/email/email.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('session.secret'),
        signOptions: {
          expiresIn: config.get<string>('session.expiresIn'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User, Session]),
    EmailModule,
  ],
  providers: [AuthService, SessionService],
  controllers: [AuthController],
  exports: [SessionService, AuthService],
})
export class AuthModule {}
