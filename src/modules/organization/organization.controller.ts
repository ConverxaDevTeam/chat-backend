import { Controller, Get, UseGuards, Logger, Body, Post, Delete, Param, Patch, UseInterceptors, ConflictException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateWizardStatusDto } from './dto/update-wizard-status.dto';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { UserOrganizationService } from './UserOrganization.service';
import { UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Organization, OrganizationType, WizardStatus } from '@models/Organization.entity';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { SuperAdminGuard } from '@modules/auth/guards/super-admin.guard';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { AgenteType } from 'src/interfaces/agent';

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
    const formattedOrganization = organizations.map(({ userOrganizations, ...organization }) => {
      const uniqueEmails = new Set(userOrganizations.filter((uo) => uo.user).map((uo) => uo.user.email));
      const agentType = organization.departamentos?.[0]?.agente?.type || AgenteType.CONVERXA_ASISTENTE;
      return {
        ...organization,
        logo: organization.logo,
        users: uniqueEmails.size,
        departments: organization.departamentos?.length || 0,
        owner: userOrganizations.find((userOrganization) => userOrganization.role === 'owner'),
        agentType,
      };
    });
    return { ok: true, organizations: formattedOrganization };
  }

  @ApiOperation({ summary: 'Obtiene tu datos de usuario' })
  @ApiBearerAuth()
  @Get('my-organizations')
  async getMyOrganizations(@GetUser() user: User) {
    const userOrganizations = await this.userOrganizationService.getMyOrganizations(user);
    // Obtener información de límites para cada organización
    const organizationsWithLimits = await Promise.all(
      userOrganizations.map(async (userOrg) => {
        try {
          // Acceder al tipo de organización a través de la relación
          const orgType = userOrg.organization?.type;
          const orgId = userOrg.organization?.id;

          // Solo obtener límites para organizaciones FREE y CUSTOM
          if (orgId && (orgType === OrganizationType.FREE || orgType === OrganizationType.CUSTOM)) {
            const limitInfo = await this.organizationService.getOrganizationLimitInfo(orgId);
            return {
              ...userOrg,
              organization: {
                ...userOrg.organization,
                limitInfo,
              },
            };
          }
          return userOrg;
        } catch (error) {
          // Si hay algún error al obtener los límites, devolver la organización sin información de límites
          return userOrg;
        }
      }),
    );

    return {
      ok: true,
      organizations: organizationsWithLimits,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'crear una organización' })
  @Post('')
  @UseInterceptors(FileInterceptor('logo'))
  async createOrganization(@Body() createOrganizationDto: CreateOrganizationDto, @UploadedFile() file: Express.Multer.File, @GetUser() user: User) {
    // Verificar si el usuario es USR_TECNICO o no tiene organizaciones
    const userOrganizations = await this.userOrganizationService.getMyOrganizations(user);
    const isUserTecnico = userOrganizations.some((uo) => uo.role === OrganizationRoleType.USR_TECNICO);
    const hasNoOrganizations = userOrganizations.length === 0;

    // Si no es USR_TECNICO y ya tiene organizaciones, no permitir crear más
    if (!isUserTecnico && !hasNoOrganizations && !user.is_super_admin) {
      throw new ConflictException('No puedes crear más de una organización. Contacta al administrador si necesitas ayuda.');
    }

    // Pasar el flag de superusuario al servicio
    const isSuperUser = user.is_super_admin;
    const organization = await this.organizationService.createOrganization(createOrganizationDto, file, isSuperUser);
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
  @Patch(':organizationId/set-owner')
  async setUserInOrganizationById(@Param('organizationId') organizationId: number, @Body('owner_id') userId: number) {
    const user = await this.organizationService.setUserInOrganizationById(organizationId, userId);
    return { ok: true, user };
  }

  @UseGuards(JwtAuthRolesGuard)
  @Roles(OrganizationRoleType.USR_TECNICO)
  @ApiOperation({ summary: 'Actualizar cualquier campo de la organización' })
  @Patch(':organizationId')
  async updateOrganization(
    @Param('organizationId') organizationId: number,
    @Body() { owner_id, name, description, type }: { owner_id?: number; name?: string; description?: string; type?: OrganizationType },
  ) {
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

    if (type !== undefined) {
      updateData.type = type;
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

  @ApiOperation({ summary: 'Actualizar el tipo de agente de la organización' })
  @Patch(':organizationId/agent-type')
  async updateAgentType(@Param('organizationId') organizationId: number, @Body('agentType') agentType: AgenteType) {
    await this.organizationService.updateAgentType(organizationId, agentType);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar el estado del wizard de la organización' })
  @Patch(':organizationId/wizard-status')
  async updateWizardStatus(@Param('organizationId') organizationId: number, @Body() updateWizardStatusDto: UpdateWizardStatusDto, @GetUser() user: User) {
    await this.organizationService.updateWizardStatus(organizationId, updateWizardStatusDto.wizardStatus, user);
    return { ok: true };
  }
}
