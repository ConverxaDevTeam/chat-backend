import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { FacebookController } from './facebook.controller';
import { FacebookService } from './facebook.service';

@Module({
  providers: [FacebookService],
  controllers: [FacebookController],
  imports: [forwardRef(() => AuthModule), forwardRef(() => UserModule)],
  exports: [FacebookService],
})
export class FacebookModule {}
