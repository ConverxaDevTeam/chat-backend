import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
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
import type { Request } from 'express';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  async logIn(req, logInDto: LogInDto) {
    const user = await this.userService.userExistByEmail(logInDto.email);

    if (!user) {
      throw new NotFoundException('El usuario no existe.');
    }

    const userPassword = await this.userService.findByEmailWithPassword(logInDto.email);
    console.log('passwords;', userPassword, logInDto);
    console.log(bcrypt.compareSync(logInDto.password, userPassword));
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
    console.log('[GUARD-DEBUG-1] validateSession called with token:', accessToken?.substring(0, 20) + '...');

    if (!accessToken) {
      throw new UnauthorizedException({
        message: 'Token no valido',
      });
    }

    console.log('[GUARD-DEBUG-2] About to validate access token');
    const accessTokenData = await this.validateAccessToken(accessToken);
    console.log('[GUARD-DEBUG-3] Access token data:', accessTokenData);

    if (!accessTokenData) {
      throw new UnauthorizedException({
        message: 'Token no valido',
      });
    }

    console.log('[GUARD-DEBUG-4] About to find session for userId:', accessTokenData.userId, 'sessionId:', accessTokenData.sessionId);
    const session = await this.sessionService.findByIds(accessTokenData.userId, accessTokenData.sessionId);
    console.log('[GUARD-DEBUG-5] Session found:', !!session);

    if (!session) {
      throw new UnauthorizedException({
        message: 'Unauthorized',
      });
    }

    console.log('[GUARD-DEBUG-6] About to find user by ID:', accessTokenData.userId);
    const user = await this.userService.findById(accessTokenData.userId);
    console.log('[GUARD-DEBUG-7] User found:', user ? 'YES' : 'NO', 'user data:', user);

    console.log('[GUARD-DEBUG-8] validateSession completed successfully');
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

  /**
   * Autentica a un usuario utilizando un token de acceso de Google
   * @param req Objeto de solicitud HTTP
   * @param googleLoginDto DTO con el token de acceso de Google
   * @returns Objeto con tokens de autenticación JWT
   */
  async googleLogin(req: Request, googleLoginDto: GoogleLoginDto): Promise<{ ok: boolean; token: string; refreshToken: string }> {
    try {
      if (!googleLoginDto.token) {
        throw new BadRequestException('Token de Google no proporcionado');
      }

      let payload: { email: string; sub: string; name?: string; picture?: string };
      try {
        // Obtener información del usuario usando el token de acceso
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${googleLoginDto.token}`,
          },
        });

        payload = response.data;

        if (!payload || !payload.email) {
          throw new UnauthorizedException('Token de Google válido pero sin información de email');
        }
      } catch (error) {
        this.logger.error(`Error al obtener información de Google: ${error.message}`);
        throw new UnauthorizedException('Error al verificar el token de Google. Asegúrate de usar un token de acceso válido.');
      }

      // Buscar si el usuario ya existe con más campos
      let user = await this.userService.findByEmailComplete(payload.email);

      // Si no existe, crear un nuevo usuario
      if (!user) {
        const newUser: {
          email: string;
          name?: string;
          password: string;
          google_id: string;
          picture?: string;
        } = {
          email: payload.email,
          name: payload.name || 'Usuario de Google',
          password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Generar contraseña aleatoria
          google_id: payload.sub,
          picture: payload.picture,
        };

        user = await this.userService.createUserFromGoogle(newUser);
      } else if (!user.google_id) {
        // Si el usuario existe pero no tiene google_id, actualizamos todos los campos relevantes

        // Preparar datos para actualizar
        const updateData: any = {
          google_id: payload.sub,
          email_verified: true,
        };

        // Actualizar foto si existe
        if (payload.picture) {
          updateData.picture = payload.picture;
        }

        // Actualizar nombre si existe y los campos están vacíos
        if (payload.name && (!user.first_name || !user.last_name)) {
          const nameParts = payload.name.split(' ');
          if (nameParts.length > 1) {
            updateData.first_name = !user.first_name ? nameParts[0] : user.first_name;
            updateData.last_name = !user.last_name ? nameParts.slice(1).join(' ') : user.last_name;
          } else {
            updateData.first_name = !user.first_name ? payload.name : user.first_name;
          }
        }

        await this.userService.updateUserWithGoogleInfo(user.id, updateData);

        // Obtener el usuario actualizado
        const updatedUser = await this.userService.findByEmailComplete(payload.email);
        if (!updatedUser) {
          throw new InternalServerErrorException('Error al obtener usuario actualizado');
        }
        user = updatedUser;
      } else {
        // Siempre actualizamos la información de Google para mantenerla al día
        await this.userService.updateGoogleInfo(user.id, {
          google_id: payload.sub,
          picture: payload.picture || user.picture,
        });
      }

      // Verificar que el usuario exista antes de continuar
      if (!user) {
        throw new InternalServerErrorException('Error al procesar usuario');
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
      this.logger.error(`Error en googleLogin: ${error.message}`);
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar la autenticación con Google');
    }
  }

  /**
   * Registra un nuevo usuario
   * @param req Objeto de solicitud HTTP
   * @param signUpDto DTO con la información de registro
   * @returns Objeto con tokens de autenticación JWT
   */
  async signUp(req: Request, signUpDto: SignUpDto): Promise<{ ok: boolean; token: string; refreshToken: string }> {
    try {
      // Verificar si existe un usuario con el mismo email
      const existingUser = await this.userService.findByEmailComplete(signUpDto.email);

      // Si existe un usuario con Google ID, no permitir registro con contraseña
      if (existingUser && existingUser.google_id) {
        throw new ConflictException('Ya existe una cuenta con este email usando autenticación de Google. Por favor, inicie sesión con Google.');
      }

      // Si existe un usuario sin Google ID, no permitir registro duplicado
      if (existingUser) {
        throw new ConflictException('Ya existe una cuenta con este email. Por favor, inicie sesión con su contraseña.');
      }

      // Si se proporciona un token de Google, intentar autenticar con Google primero
      if (signUpDto.google_token) {
        try {
          const googleLoginDto = new GoogleLoginDto();
          googleLoginDto.token = signUpDto.google_token;
          return await this.googleLogin(req, googleLoginDto);
        } catch (error) {
          this.logger.error(`Error al autenticar con Google durante el registro: ${error.message}`);
          // Si falla la autenticación con Google, continuar con el registro normal
        }
      }

      // Crear el usuario con el servicio existente
      // Nota: getUserForEmailOrCreate genera una contraseña aleatoria si el usuario no existe
      const { created, user: createdUser } = await this.userService.getUserForEmailOrCreate(signUpDto.email.toLowerCase());

      // Si el usuario fue creado, actualizamos sus datos
      if (created) {
        // Actualizar los datos del usuario con la información proporcionada
        await this.userService.updateGlobalUser(createdUser.id, {
          first_name: signUpDto.first_name,
          last_name: signUpDto.last_name,
        });

        // Actualizar la contraseña con la proporcionada por el usuario
        // Usamos changePasswordAsAdmin porque no conocemos la contraseña generada aleatoriamente
        await this.userService.changePasswordAsAdmin(createdUser.id, signUpDto.password);
      } else {
        // Si el usuario ya existe (lo cual no debería ocurrir debido a nuestras validaciones previas)
        throw new ConflictException('Usuario ya existe');
      }

      // Usuario creado y actualizado
      const savedUser = createdUser;

      // Generar tokens de autenticación
      const { session, refreshToken } = await this.generateAccessRefreshToken(req, savedUser);
      const token = await this.generateAccessToken(savedUser.id, session.id);

      // Enviar email de bienvenida (sin incluir la contraseña por seguridad)
      // El usuario ya conoce su contraseña porque la proporcionó durante el registro
      await this.emailService.sendUserWellcome(savedUser.email, '********');

      return { ok: true, token, refreshToken };
    } catch (error) {
      this.logger.error(`Error en signUp: ${error.message}`);
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar el registro');
    }
  }
}
