import { forwardRef, Inject, Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { User } from '../../models/User.entity';
import { Session } from '@models/Session.entity';
import { SessionService } from './session.service';
import { ConfigService } from '@nestjs/config';
import { LogInDto } from './dto/log-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EmailService } from '../email/email.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

export class validatedSession {
  user: User;
  sessionId: number;
}

export class validatedSessionToken {
  user?: User;
  sessionId?: number;
  isValidToken: boolean;
}

class AccessRefreshTokenGenerated {
  session: Session;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  userRepository: any;
  private googleClient: OAuth2Client;

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  async logIn(req, logInDto: LogInDto) {
    const user = await this.userService.userExistByEmail(logInDto.email);

    if (!user) {
      throw new NotFoundException('El usuario no existe.');
    }

    const userPassword = await this.userService.findByEmailWithPassword(logInDto.email);

    if (!bcrypt.compareSync(logInDto.password, userPassword)) {
      throw new UnauthorizedException('Contraseña no válida.');
    }

    await this.userService.updateLastLogin(user);

    const { refreshToken, session } = await this.generateAccessRefreshToken(req, user);

    const token = await this.generateAccessToken(user.id, session.id);

    return {
      ok: true,
      token,
      refreshToken,
    };
  }

  async generateAccessRefreshToken(req, user: User): Promise<AccessRefreshTokenGenerated> {
    const session = await this.sessionService.createSession(req, user);

    const payload = { userId: user.id, sessionId: session.id };

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('session.secretKeyRefresh'),
      expiresIn: this.configService.get<string>('session.jwtTokenRefreshExpiration'),
    });

    return { refreshToken, session };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<string> {
    const refreshTokenData = await this.validateAccessRefreshToken(refreshTokenDto.refresh_token);

    if (!refreshTokenData) {
      throw new UnauthorizedException({
        message: 'Refresh token no valido',
      });
    }

    const session = await this.sessionService.findById(refreshTokenData.sessionId);

    if (!session) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }

    const payload = {
      userId: refreshTokenData.userId,
      sessionId: refreshTokenData.sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('session.secretKey'),
      expiresIn: this.configService.get<string>('session.jwtTokenExpiration'),
    });

    return accessToken;
  }

  async removeSession(user: User, sessionId): Promise<void> {
    await this.sessionService.removeByIds(user, sessionId);
  }

  async getSessions(userId): Promise<Session[]> {
    return await this.sessionService.getSessionsByUserId(userId);
  }

  async generateAccessToken(userId, sessionId): Promise<string> {
    const payload = { userId: userId, sessionId: sessionId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('session.secretKey'),
      expiresIn: this.configService.get<string>('session.jwtTokenExpiration'),
    });

    return accessToken;
  }

  async validateSession(accessToken: string): Promise<validatedSession> {
    if (!accessToken) {
      throw new UnauthorizedException({
        message: 'Token no valido',
      });
    }

    const accessTokenData = await this.validateAccessToken(accessToken);

    if (!accessTokenData) {
      throw new UnauthorizedException({
        message: 'Token no valido',
      });
    }

    const session = await this.sessionService.findByIds(accessTokenData.userId, accessTokenData.sessionId);

    if (!session) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }

    const user = await this.userService.findById(accessTokenData.userId);

    return { user: user, sessionId: accessTokenData.sessionId };
  }

  async validateAccessTokenSocket(accessToken: string) {
    try {
      const data = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>('session.secretKey'),
      });

      return data;
    } catch (e) {
      return null;
    }
  }

  async validateAccessToken(accessToken: string) {
    try {
      const data = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>('session.secretKey'),
      });

      return data;
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        throw new UnauthorizedException('El token ha caducado');
      }
      return null;
    }
  }

  async validateAccessRefreshToken(refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('session.secretKeyRefresh'),
      });

      return data;
    } catch (e) {
      if (e instanceof TokenExpiredError) {
        throw new UnauthorizedException('El refresh token ha caducado');
      }
    }
  }

  async requestResetPassword(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Email inválido');
    }
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationMinutes = parseInt(this.configService.get('RESET_PASSWORD_CODE_EXPIRATION') || '15');
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + expirationMinutes);
    await this.userService.updateResetPasswordCode(user.id, code, expires);
    await this.emailService.sendResetPasswordCode(email, code);
    return { ok: true, message: 'Código enviado al email' };
  }

  private async validateResetCode(email: string, code: string): Promise<User> {
    const user = await this.userService.findByEmailWithResetCode(email);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.reset_password_code || !user.reset_password_expires) {
      throw new UnauthorizedException('No hay código de reset activo');
    }

    if (user.reset_password_code !== code) {
      throw new UnauthorizedException('Código inválido');
    }

    const now = new Date();
    if (now.getTime() > user.reset_password_expires.getTime()) {
      throw new BadRequestException('El código de reset password ha expirado');
    }

    return user;
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.validateResetCode(email, code);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updatePassword(user.id, hashedPassword);
    return { ok: true, message: 'Password actualizado exitosamente' };
  }

  async googleLogin(req, googleLoginDto: GoogleLoginDto) {
    try {
      if (!googleLoginDto.token) {
        throw new BadRequestException('Token de Google no proporcionado');
      }

      this.logger.log(`Intentando autenticar con Google usando token: ${googleLoginDto.token.substring(0, 10)}...`);

      let payload;
      try {
        // Obtener información del usuario usando el token de acceso
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${googleLoginDto.token}`,
          },
        });

        payload = response.data;
        this.logger.log(`Información de usuario obtenida de Google: ${JSON.stringify(payload)}`);

        if (!payload || !payload.email) {
          throw new UnauthorizedException('Token de Google válido pero sin información de email');
        }
      } catch (error) {
        this.logger.error(`Error al obtener información de Google: ${error.message}`);
        if (error.response) {
          this.logger.error(`Respuesta de error: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          this.logger.error('No se recibió respuesta del servidor de Google');
        }
        throw new UnauthorizedException('Error al verificar el token de Google. Asegúrate de usar un token de acceso válido.');
      }

      // Buscar si el usuario ya existe con más campos
      let user = await this.userService.findByEmailComplete(payload.email);

      // Si no existe, crear un nuevo usuario
      if (!user) {
        const newUser = {
          email: payload.email,
          name: payload.name || 'Usuario de Google',
          password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Generar contraseña aleatoria
          google_id: payload.sub,
          picture: payload.picture,
        };

        this.logger.log(`Creando nuevo usuario desde Google: ${payload.email}`);
        user = await this.userService.createUserFromGoogle(newUser);
      } else {
        this.logger.log(`Usuario existente encontrado: ${user.email}, actualizando información de Google`);
        // Siempre actualizamos la información de Google para mantenerla al día
        await this.userService.updateGoogleInfo(user.id, {
          google_id: payload.sub,
          picture: payload.picture || user.picture,
        });
      }

      // Actualizar último login
      await this.userService.updateLastLogin(user);

      // Generar tokens
      const { refreshToken, session } = await this.generateAccessRefreshToken(req, user);
      const token = await this.generateAccessToken(user.id, session.id);

      return {
        ok: true,
        token,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`Error en googleLogin: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar la autenticación con Google');
    }
  }
}
