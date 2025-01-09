import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { OrganizationService } from '@modules/organization/organization.service';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { AddUserInOrganizationDto } from '@modules/socket/dto/add-user-in-organization.dto';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly organizationService: OrganizationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene tu datos de usuario' })
  @ApiBearerAuth()
  @Get('')
  async getProfile(@GetUser() user: User) {
    return {
      ok: true,
      user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene tu datos de usuario' })
  @ApiBearerAuth()
  @Get('all/:organizationId')
  async AllUserMyOrganization(@GetUser() user: User, @Param('organizationId') organizationId: number) {
    if (!user.is_super_admin) {
      const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);
      const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
      if (!allowedRoles.includes(rolInOrganization)) {
        throw new NotFoundException('No tienes permisos para obtener los usuarios de esta organización.');
      }
    }

    const users = await this.userService.AllUserMyOrganization(organizationId);

    const userFormat = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      email_verified: user.email_verified,
      last_login: user.last_login,
      role: user.userOrganizations[0]?.role || 'user',
    }));

    return {
      ok: true,
      users: userFormat,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene tu datos de usuario' })
  @ApiBearerAuth()
  @Post('add/:organizationId')
  async addUserInOrganizationById(@GetUser() user: User, @Param('organizationId') organizationId: number, @Body() addUserInOrganizationDto: AddUserInOrganizationDto) {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);
    const allowedRoles = [OrganizationRoleType.OWNER];

    if (!allowedRoles.includes(rolInOrganization)) {
      throw new NotFoundException('No tienes permisos agregar usuarios a esta organización.');
    }

    const userAdd = await this.organizationService.addUserInOrganizationById(organizationId, addUserInOrganizationDto.email);

    return {
      ok: true,
      user: userAdd,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene usuarios globales' })
  @ApiBearerAuth()
  @Get('')
  async getGlobalUsers(@GetUser() user: User) {
    const users = await this.userService.getGlobalUsers(user);
    return {
      ok: true,
      users: users,
    };
  }
  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'crea un usuario global' })
  @ApiBearerAuth()
  @Post('')
  async createGlobalUser(@Body() email: string, @Body() role: OrganizationRoleType, @Body() organizationId?: number) {
    const userAdd = await this.userService.getUserForEmailOrCreate(email);
    await this.userService.setGlobalRole(userAdd.user, role, organizationId);

    return {
      ok: true,
      user: userAdd,
    };
  }
}
