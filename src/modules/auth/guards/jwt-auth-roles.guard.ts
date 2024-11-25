import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from '@infrastructure/constants';

@Injectable()
export class JwtAuthRolesGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedRoles = this.reflector.get<string[]>(META_ROLES, context.getHandler());
    if (!allowedRoles) {
      return true; // Si no hay roles especificados, permitir el acceso
    }
    try {
      const request = context.switchToHttp().getRequest();
      const { authorization }: any = request.headers;
      if (!authorization || authorization.trim() === '') {
        throw new UnauthorizedException('Please provide token');
      }
      const accessToken = authorization.replace(/bearer/gim, '').trim();
      const { user, sessionId } = await this.authService.validateSession(accessToken);
      request.user = user;
      request.sessionId = sessionId;
      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenException('You do not have permission to access this resource');
      }
      return true;
    } catch (error) {
      throw new ForbiddenException(error.message || 'Session expired! Please sign in');
    }
  }
}
