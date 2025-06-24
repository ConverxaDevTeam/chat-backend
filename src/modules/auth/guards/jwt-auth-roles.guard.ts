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
        throw new UnauthorizedException('Por favor proporcione un token');
      }

      const accessToken = authorization.replace(/bearer/gim, '').trim();
      const { user, sessionId } = await this.authService.validateSession(accessToken);
      if (!user) {
        throw new UnauthorizedException('Sesión inválida');
      }

      request.user = user;
      request.sessionId = sessionId;

      if (user.is_super_admin) return true;

      const allowedRoles = this.reflector.get<string[]>(META_ROLES, context.getHandler());
      if (!allowedRoles) return true;
      // Get organizationId from URL parameters
      const organizationId = parseInt(request.params.organizationId);

      if (!organizationId || isNaN(organizationId)) {
        // If no organizationId in URL, check roles globally (backwards compatibility)
        const hasRole = allowedRoles.some((role) => user.userOrganizations?.some((userOrganization) => userOrganization.role?.includes(role)));
        if (!hasRole) {
          throw new ForbiddenException('No tienes el rol requerido para acceder a este recurso');
        }
      } else {
        // Check role specifically for the organization in the URL
        const userOrgRole = user.userOrganizations?.find((uo) => uo.organizationId === organizationId)?.role;

        if (!userOrgRole) {
          throw new ForbiddenException('No tienes acceso a esta organización');
        }

        const hasRoleInOrg = allowedRoles.some((role) => userOrgRole.includes(role));
        if (!hasRoleInOrg) {
          throw new ForbiddenException(`No tienes el rol requerido (${allowedRoles.join(', ')}) en esta organización`);
        }
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
