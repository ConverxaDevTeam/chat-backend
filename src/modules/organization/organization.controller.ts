import { Controller, Get, UseGuards, Logger, Body, Post, Delete, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { UserOrganizationService } from './UserOrganization.service';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { SuperAdminGuard } from '@modules/auth/guards/super-admin.guard';

@Controller('organization')
@ApiTags('organization')
@ApiBearerAuth()
@UseGuards(JwtAuthRolesGuard)
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userOrganizationService: UserOrganizationService,
  ) {}

  @Roles(OrganizationRoleType.ING_PREVENTA)
  @ApiOperation({ summary: 'obtener todas las organizaciones, solo super admin' })
  @Get('')
  async getAll() {
    const organizations = await this.organizationService.getAll();
    const formattedOrganization = organizations.map(({ userOrganizations, ...organization }) => ({
      ...organization,
      users: userOrganizations.length,
      owner: userOrganizations.find((userOrganization) => userOrganization.role === 'owner'),
    }));
    return { ok: true, organizations: formattedOrganization };
  }

  @ApiOperation({ summary: 'Obtiene tu datos de usuario' })
  @ApiBearerAuth()
  @Get('my-organizations')
  async getMyOrganizations(@GetUser() user: User) {
    const organizations = await this.userOrganizationService.getMyOrganizations(user);
    return {
      ok: true,
      organizations,
    };
  }

  @ApiOperation({ summary: 'crear una organización, solo super admin' })
  @Post('')
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto) {
    const organization = await this.organizationService.createOrganization(createOrganizationDto);
    return { ok: true, organization };
  }

  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'eliminacion suave de una organización, solo super admin' })
  @Delete(':id')
  async deleteOrganization(@Param('id') id: number) {
    const organization = await this.organizationService.deleteOrganization(id);
    return { ok: true, organization };
  }

  @ApiOperation({ summary: 'setear un usuario a una organización, solo super admin' })
  @Patch(':organizationId')
  async setUserInOrganizationById(@Param('organizationId') organizationId: number, @Body('owner_id') userId: number) {
    const user = await this.organizationService.setUserInOrganizationById(organizationId, userId);
    return { ok: true, user };
  }
}
