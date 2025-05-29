import { Public } from '@infrastructure/decorators/public-route.decorator';
import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { GetSessionId } from '@infrastructure/decorators/get-session-id.decorator';
import { LogInDto } from './dto/log-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiBody({ type: LogInDto })
  @ApiOperation({ summary: 'Logea el user con email y password' })
  @Post('/log-in')
  async logIn(
    @Body() logInDto: LogInDto,
    @Req()
    request: Request,
  ) {
    const userResponse = await this.authService.logIn(request, logInDto);
    return userResponse;
  }

  @Public()
  @ApiBody({ type: RefreshTokenDto })
  @ApiOperation({ summary: 'Refresca el token' })
  @Post('/refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const token = await this.authService.refreshToken(refreshTokenDto);
    return { ok: true, token };
  }

  @Public()
  @Post('/request-reset-password')
  @ApiOperation({ summary: 'Solicita reset de password' })
  async requestResetPassword(@Body() { email }: RequestResetPasswordDto) {
    return this.authService.requestResetPassword(email);
  }

  @Public()
  @Post('/reset-password')
  @ApiOperation({ summary: 'Resetea password con código' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.email, resetPasswordDto.code, resetPasswordDto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Elimina la session actual del user' })
  @Post('/log-out')
  async getProfile(@GetUser() user: User, @GetSessionId() sessionId: number) {
    await this.authService.removeSession(user, sessionId);
    return { ok: true, user, sessionId };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene todas las sessions del user' })
  @Get('/session')
  async getSessions(@GetUser() user: User) {
    const sessions = await this.authService.getSessions(user.id);
    return { ok: true, sessions: sessions };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Elimina una session especifica del user' })
  @Delete('/session/:id')
  async deleteSession(@Param('id') id: number, @GetUser() user: User) {
    await this.authService.removeSession(user, id);
    return { ok: true };
  }
}
