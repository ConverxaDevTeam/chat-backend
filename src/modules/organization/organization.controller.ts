import { Controller, Get, UseGuards, Logger, Body, Post, Delete, Param, Patch, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { UserOrganizationService } from './UserOrganization.service';
import { UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Organization } from '@models/Organization.entity';

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
    const formattedOrganization = organizations.map(({ userOrganizations, ...organization }) => {
      const uniqueEmails = new Set(userOrganizations.map((uo) => uo.user.email));
      return {
        ...organization,
        logo: organization.logo,
        users: uniqueEmails.size,
        owner: userOrganizations.find((userOrganization) => userOrganization.role === 'owner'),
      };
    });
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
  @UseInterceptors(FileInterceptor('logo'))
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto, @UploadedFile() file: Express.Multer.File) {
    const organization = await this.organizationService.createOrganization(createOrganizationDto, file);
    return { ok: true, organization };
  }

  @UseGuards(JwtAuthRolesGuard)
  @ApiOperation({ summary: 'eliminacion suave de una organización, solo super admin' })
  @Delete(':id')
  async deleteOrganization(@Param('id') id: number) {
    const organization = await this.organizationService.deleteOrganization(id);
    return { ok: true, organization };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'setear un usuario a una organización, solo super admin' })
  @Patch(':organizationId/set-owner')
  async setUserInOrganizationById(@Param('organizationId') organizationId: number, @Body('owner_id') userId: number) {
    const user = await this.organizationService.setUserInOrganizationById(organizationId, userId);
    return { ok: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar cualquier campo de la organización, solo super admin' })
  @Patch(':organizationId')
  async updateOrganization(@Param('organizationId') organizationId: number, @Body() { owner_id, name, description }: { owner_id?: number; name?: string; description?: string }) {
    const updateData: Partial<Organization> = {};
    if (owner_id !== undefined) {
      await this.organizationService.setUserInOrganizationById(organizationId, owner_id);
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    const organization = await this.organizationService.updateOrganization(organizationId, updateData);
    return { ok: true, organization };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':organizationId/logo')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiOperation({ summary: 'Actualizar logo de la organización' })
  async updateLogo(@Param('organizationId') organizationId: number, @UploadedFile() logo: Express.Multer.File) {
    if (!logo) {
      await this.organizationService.deleteLogo(organizationId);
      return { ok: true };
    }
    const organization = await this.organizationService.updateLogo(organizationId, logo);
    return { ok: true, organization };
  }
}
