import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const { authorization }: any = request.headers;

      if (!authorization?.trim()) {
        throw new UnauthorizedException('Por favor proporcione un token');
      }

      const accessToken = authorization.replace(/bearer/gim, '').trim();
      const { user, sessionId } = await this.authService.validateSession(accessToken);

      if (!user) {
        throw new UnauthorizedException('Sesión inválida');
      }

      request.user = user;
      request.sessionId = sessionId;

      if (!user.is_super_admin) {
        throw new ForbiddenException('Esta ruta requiere privilegios de super administrador');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Sesión expirada o inválida');
    }
  }
}
