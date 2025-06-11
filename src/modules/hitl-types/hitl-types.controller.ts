import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { HitlTypesService } from './hitl-types.service';
import { CreateHitlTypeDto } from './dto/create-hitl-type.dto';
import { UpdateHitlTypeDto } from './dto/update-hitl-type.dto';
import { AssignUsersHitlTypeDto } from './dto/assign-users-hitl-type.dto';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';

import { User } from '@models/User.entity';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { GetOrganization } from '@infrastructure/decorators/get-organization.decorator';

@ApiTags('hitl-types')
@Controller('organizations/:organizationId/hitl-types')
@UseGuards(JwtAuthRolesGuard)
@ApiBearerAuth()
export class HitlTypesController {
  constructor(private readonly hitlTypesService: HitlTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo tipo HITL (solo OWNER)' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @Roles('owner')
  create(@GetUser() user: User, @GetOrganization() organizationId: number, @Body() createHitlTypeDto: CreateHitlTypeDto) {
    return this.hitlTypesService.create(user, organizationId, createHitlTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los tipos HITL de la organización' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  findAll(@GetUser() user: User, @GetOrganization() organizationId: number) {
    return this.hitlTypesService.findAll(user, organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un tipo HITL específico' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  findOne(@GetUser() user: User, @GetOrganization() organizationId: number, @Param('id', ParseIntPipe) id: number) {
    return this.hitlTypesService.findOne(user, organizationId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un tipo HITL (solo OWNER)' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @Roles('owner')
  update(@GetUser() user: User, @GetOrganization() organizationId: number, @Param('id', ParseIntPipe) id: number, @Body() updateHitlTypeDto: UpdateHitlTypeDto) {
    return this.hitlTypesService.update(user, organizationId, id, updateHitlTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un tipo HITL (solo OWNER)' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @Roles('owner')
  remove(@GetUser() user: User, @GetOrganization() organizationId: number, @Param('id', ParseIntPipe) id: number) {
    return this.hitlTypesService.remove(user, organizationId, id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Asignar usuarios a un tipo HITL (solo OWNER)' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @Roles('owner')
  assignUsers(@GetUser() user: User, @GetOrganization() organizationId: number, @Param('id', ParseIntPipe) hitlTypeId: number, @Body() assignUsersDto: AssignUsersHitlTypeDto) {
    return this.hitlTypesService.assignUsers(user, organizationId, hitlTypeId, assignUsersDto);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: 'Remover usuario de un tipo HITL (solo OWNER)' })
  @ApiParam({ name: 'organizationId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'userId', type: 'number' })
  @Roles('owner')
  removeUserAssignment(
    @GetUser() user: User,
    @GetOrganization() organizationId: number,
    @Param('id', ParseIntPipe) hitlTypeId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.hitlTypesService.removeUserAssignment(user, organizationId, hitlTypeId, userId);
  }
}
