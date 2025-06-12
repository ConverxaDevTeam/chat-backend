import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { OrganizationService } from '@modules/organization/organization.service';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { AddUserInOrganizationDto } from '@modules/socket/dto/add-user-in-organization.dto';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { UpdateUserDto } from './update-user.dto';
import { ChangeUserRoleDto } from './change-user-role.dto';
import { ForbiddenException } from '@nestjs/common';

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
  @Get('global')
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
  async createGlobalUser(@Body() { email, role, organizationId }: { email: string; role: OrganizationRoleType; organizationId: number }) {
    const userAdd = await this.userService.getUserForEmailOrCreate(email);
    await this.userService.setGlobalRole(userAdd.user, role, organizationId);
    return {
      ok: true,
      user: userAdd,
    };
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'elimina un usuario global' })
  @ApiBearerAuth()
  @Delete('global/:userId')
  async deleteGlobalUser(@Param('userId') userId: number) {
    await this.userService.deleteGlobalUser(userId);
    return {
      ok: true,
    };
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'Obtiene un usuario global por ID' })
  @ApiBearerAuth()
  @Get('global/:userId')
  async getGlobalUser(@Param('userId') userId: number) {
    const user = await this.userService.getGlobalUser(userId);
    return { ok: true, user };
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'Actualiza un usuario global' })
  @ApiBearerAuth()
  @Put('global/:userId')
  async updateGlobalUser(@Param('userId') userId: number, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.userService.updateGlobalUser(userId, updateUserDto);
    return { ok: true, user: updatedUser };
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'Elimina un rol de usuario' })
  @ApiBearerAuth()
  @Delete('role/:roleId')
  async deleteRole(@Param('roleId') roleId: number) {
    const updatedUser = await this.userService.deleteRole(roleId);
    return { ok: true, user: updatedUser };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cambiar password del usuario' })
  @ApiBearerAuth()
  @Post('change-password')
  async changePassword(@GetUser() user: User, @Body() changePasswordDto: { currentPassword: string; newPassword: string }) {
    return this.userService.changePassword(user.id, changePasswordDto);
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'Cambiar contraseña de usuario (solo superadmin)' })
  @ApiBearerAuth()
  @Post('change-password/:userId')
  async changePasswordAsAdmin(@Param('userId') userId: number, @Body() changePasswordDto: { newPassword: string }) {
    return this.userService.changePasswordAsAdmin(userId, changePasswordDto.newPassword);
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'Obtiene usuarios por organización para superadministradores' })
  @ApiBearerAuth()
  @Get('organization/:organizationId/users')
  async getUsersByOrganizationForSuperAdmin(@Param('organizationId') organizationId: number, @GetUser() user: User) {
    // Verificar que el usuario sea superadministrador
    if (!user.is_super_admin) {
      throw new ForbiddenException('Solo los superadministradores pueden acceder a este recurso');
    }

    const users = await this.userService.getUsersByOrganizationForSuperAdmin(organizationId);

    // Formatear la respuesta para enfatizar los emails
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.userOrganizations?.[0]?.role || 'user',
    }));

    return {
      ok: true,
      users: formattedUsers,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener usuarios de una organización' })
  @ApiBearerAuth()
  @Get('organization/:organizationId/users')
  async getOrganizationUsers(@GetUser() user: User, @Param('organizationId') organizationId: number) {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);
    const allowedRoles = [OrganizationRoleType.OWNER, OrganizationRoleType.ADMIN, OrganizationRoleType.SUPERVISOR];

    if (!allowedRoles.includes(rolInOrganization)) {
      throw new ForbiddenException('No tienes permisos para ver los usuarios de esta organización');
    }

    const users = await this.userService.getUsersByOrganizationId(organizationId);

    const formattedUsers = users.map((userOrg) => ({
      id: userOrg.user.id,
      email: userOrg.user.email,
      name: `${userOrg.user.first_name || ''} ${userOrg.user.last_name || ''}`.trim(),
      role: userOrg.role,
    }));

    return {
      ok: true,
      users: formattedUsers,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cambiar rol de usuario en organización' })
  @ApiBearerAuth()
  @Patch('organization/:organizationId/users/:userId/role')
  async changeUserRole(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('userId') userId: number, @Body() changeUserRoleDto: ChangeUserRoleDto) {
    const updatedUserOrg = await this.organizationService.changeUserRole(user, organizationId, userId, changeUserRoleDto.role);

    return {
      ok: true,
      user: {
        id: updatedUserOrg.user.id,
        email: updatedUserOrg.user.email,
        role: updatedUserOrg.role,
      },
    };
  }
}
