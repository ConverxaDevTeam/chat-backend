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
    try {
      const request = context.switchToHttp().getRequest();
      const { authorization }: any = request.headers;

      if (!authorization?.trim()) {
        throw new UnauthorizedException('Please provide token');
      }

      const accessToken = authorization.replace(/bearer/gim, '').trim();
      const { user, sessionId } = await this.authService.validateSession(accessToken);

      if (!user) {
        throw new UnauthorizedException('Invalid session');
      }

      request.user = user;
      request.sessionId = sessionId;

      if (user.is_super_admin) return true;

      const allowedRoles = this.reflector.get<string[]>(META_ROLES, context.getHandler());
      if (!allowedRoles) return true;
      const hasRole = allowedRoles.some((role) => user.userOrganizations.some((userOrganization) => userOrganization.role?.includes(role)));
      if (!hasRole) {
        throw new ForbiddenException('You do not have the required role to access this resource');
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Session expired or invalid');
    }
  }
}
