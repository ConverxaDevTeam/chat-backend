import { Controller, Get, Put, UploadedFile, UseInterceptors, UseGuards, HttpException, HttpStatus, UnsupportedMediaTypeException, SetMetadata, Body, Post } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as uuid from 'uuid';
import { UserService } from './user.service';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User, UserRoleType } from '@models/User.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { META_ROLES } from '@infrastructure/constants';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene tu datos de usuario' })
  @ApiBearerAuth()
  @Get('')
  async getProfile(@GetUser() user: User) {
    const { role, ...userWithoutRole } = user;

    if (role !== UserRoleType.USER) {
      return {
        ok: true,
        user: user,
      };
    }

    return {
      ok: true,
      user: userWithoutRole,
    };
  }
}
