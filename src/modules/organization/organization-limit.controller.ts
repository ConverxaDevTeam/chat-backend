import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationLimitService } from './organization-limit.service';
import { CreateOrganizationLimitDto, UpdateOrganizationLimitDto } from './dto/organization-limit.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { OrganizationLimit } from '../../models/OrganizationLimit.entity';

@ApiTags('organization-limits')
@Controller('organization-limits')
@UseGuards(JwtAuthGuard, JwtAuthRolesGuard)
@ApiBearerAuth()
export class OrganizationLimitController {
  constructor(private readonly organizationLimitService: OrganizationLimitService) {}

  @Post()
  @Roles(OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER)
  @ApiOperation({ summary: 'Crear límites para una organización' })
  @ApiResponse({ status: 201, description: 'Límites creados exitosamente', type: OrganizationLimit })
  create(@Body() createDto: CreateOrganizationLimitDto): Promise<OrganizationLimit> {
    return this.organizationLimitService.create(createDto);
  }

  @Get('organization/:organizationId')
  @Roles(OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener límites de una organización por su ID' })
  @ApiResponse({ status: 200, description: 'Límites encontrados', type: OrganizationLimit })
  findByOrganizationId(@Param('organizationId') organizationId: number): Promise<OrganizationLimit> {
    return this.organizationLimitService.findByOrganizationId(organizationId);
  }

  @Patch('organization/:organizationId')
  @Roles(OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER)
  @ApiOperation({ summary: 'Actualizar límites de una organización' })
  @ApiResponse({ status: 200, description: 'Límites actualizados exitosamente', type: OrganizationLimit })
  update(@Param('organizationId') organizationId: number, @Body() updateDto: UpdateOrganizationLimitDto): Promise<OrganizationLimit> {
    return this.organizationLimitService.update(organizationId, updateDto);
  }

  @Delete('organization/:organizationId')
  @Roles(OrganizationRoleType.ADMIN)
  @ApiOperation({ summary: 'Eliminar límites de una organización' })
  @ApiResponse({ status: 200, description: 'Límites eliminados exitosamente' })
  remove(@Param('organizationId') organizationId: number): Promise<void> {
    return this.organizationLimitService.remove(organizationId);
  }
}
