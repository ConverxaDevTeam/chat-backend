import { Controller, Get, UseGuards, Logger, Body, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { UserOrganizationService } from './UserOrganization.service';

@Controller('organization')
@ApiTags('organization')
@ApiBearerAuth()
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly userOrganizationService: UserOrganizationService,
  ) {}

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'obtener todas las organizaciones, solo super admin' })
  @Get('')
  async getAll() {
    const organizations = await this.organizationService.getAll();
    const formattedOrganization = organizations.map(({ userOrganizations, ...organization }) => ({
      ...organization,
      users: userOrganizations.length,
    }));
    return { ok: true, organizations: formattedOrganization };
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'crear una organización, solo super admin' })
  @Post('')
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto) {
    const organization = await this.organizationService.createOrganization(createOrganizationDto);
    return { ok: true, organization };
  }
}
