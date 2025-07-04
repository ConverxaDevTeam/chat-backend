import { Controller, Get, Put, Param, Body, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';

import { ChatUserService } from './chat-user.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { ChatUserType } from '@models/ChatUser.entity';
import { User } from '@models/User.entity';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { ChatUsersOrganizationDto } from './dto/chat-users-organization.dto';
import { BulkUpdateChatUserDto, BulkUpdateResponse } from './dto/bulk-update-chat-user.dto';

@Controller('chat-user')
@ApiTags('chat-user')
export class ChatUserController {
  constructor(private readonly chatUserService: ChatUserService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener listado de todos los usuarios de chat con información completa y última conversación' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de usuarios por página (default: 10)' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'ID de la organización para filtrar usuarios' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, email o teléfono' })
  @ApiQuery({ name: 'type', required: false, enum: ChatUserType, description: 'Filtrar por tipo de usuario' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo para ordenar: name, email, phone, last_login, created_at, last_activity (default: last_activity)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Orden: ASC o DESC (default: DESC)' })
  @ApiQuery({ name: 'needHuman', required: false, description: 'Filtrar por conversaciones que necesitan intervención humana' })
  @ApiQuery({ name: 'hasUnreadMessages', required: false, description: 'Filtrar por usuarios con mensajes no leídos' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Fecha de inicio para filtrar conversaciones (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Fecha de fin para filtrar conversaciones (ISO 8601)' })
  @ApiQuery({ name: 'includeMessages', required: false, description: 'Incluir todos los mensajes de la última conversación (default: false)' })
  @ApiBearerAuth()
  @Get('all/info')
  async getAllUsersInfo(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Query('type') type?: ChatUserType,
    @Query('sortBy') sortBy: string = 'last_activity',
    @Query('sortOrder') sortOrder: string = 'DESC',
    @Query('needHuman') needHuman?: string,
    @Query('hasUnreadMessages') hasUnreadMessages?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('includeMessages') includeMessages?: string,
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const orgId = organizationId ? parseInt(organizationId, 10) : undefined;

    // Convertir strings a booleans
    const needHumanBool = needHuman === 'true' ? true : needHuman === 'false' ? false : undefined;
    const hasUnreadMessagesBool = hasUnreadMessages === 'true' ? true : hasUnreadMessages === 'false' ? false : undefined;
    const includeMessagesBool = includeMessages === 'true';

    const result = await this.chatUserService.getAllUsersWithInfo(
      pageNumber,
      limitNumber,
      orgId,
      search,
      type,
      sortBy,
      sortOrder,
      needHumanBool,
      hasUnreadMessagesBool,
      dateFrom,
      dateTo,
      includeMessagesBool,
    );
    return {
      ok: true,
      ...result,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener información completa del usuario de chat' })
  @ApiBearerAuth()
  @Get(':id/info')
  async getUserInfo(@Param('id', ParseIntPipe) id: number) {
    const userInfo = await this.chatUserService.getUserCompleteInfo(id);
    return {
      ok: true,
      data: userInfo,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar un campo del usuario de chat',
    description: 'Permite actualizar campos editables: name, email, phone, address, avatar. Los campos técnicos (web, browser, operating_system, ip) son de solo lectura.',
  })
  @ApiBearerAuth()
  @Put(':id/info')
  async updateUserInfo(@Param('id', ParseIntPipe) id: number, @Body() updateData: { field: string; value: string }) {
    const { field, value } = updateData;

    // Campos estándar que se pueden actualizar directamente
    const editableFields = ['name', 'email', 'phone', 'address', 'avatar'];

    // Campos técnicos de solo lectura (no editables por el usuario)
    const readOnlyFields = ['web', 'browser', 'operating_system', 'ip'];

    if (editableFields.includes(field)) {
      const updatedUser = await this.chatUserService.updateUserInfo(id, field, value);
      return {
        ok: true,
        message: `Campo ${field} actualizado correctamente`,
        data: updatedUser,
      };
    } else if (readOnlyFields.includes(field)) {
      return {
        ok: false,
        message: `El campo ${field} es de solo lectura y no puede ser editado`,
      };
    } else {
      // Guardar como dato personalizado
      await this.chatUserService.saveCustomUserData(id, field, value);
      return {
        ok: true,
        message: `Dato personalizado ${field} guardado correctamente`,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar múltiples campos del usuario de chat (actualización masiva)' })
  @ApiBody({
    type: BulkUpdateChatUserDto,
    description: 'Datos para actualización masiva del usuario de chat',
    examples: {
      'ejemplo-completo': {
        summary: 'Actualización completa',
        description: 'Ejemplo actualizando campos estándar y personalizados',
        value: {
          standardFields: {
            name: 'Juan Pérez',
            email: 'juan.perez@ejemplo.com',
            phone: '+1234567890',
            address: 'Calle 123, Ciudad',
          },
          customFields: {
            empresa: 'Mi Empresa SA',
            ciudad: 'Buenos Aires',
            edad: '30',
          },
        },
      },
      'solo-estandar': {
        summary: 'Solo campos estándar',
        description: 'Ejemplo actualizando solo campos estándar',
        value: {
          standardFields: {
            name: 'María García',
            email: 'maria@ejemplo.com',
          },
        },
      },
      'solo-personalizado': {
        summary: 'Solo campos personalizados',
        description: 'Ejemplo actualizando solo campos personalizados',
        value: {
          customFields: {
            empresa: 'Nueva Empresa',
            puesto: 'Gerente',
          },
        },
      },
    },
  })
  @ApiBearerAuth()
  @Put(':id/bulk-update')
  async bulkUpdateUserInfo(@Param('id', ParseIntPipe) id: number, @Body() updateData: BulkUpdateChatUserDto): Promise<BulkUpdateResponse> {
    const result = await this.chatUserService.bulkUpdateChatUser(id, updateData);
    return result;
  }

  @UseGuards(JwtAuthGuard, JwtAuthRolesGuard)
  @ApiOperation({ summary: 'Obtener chat users de una organización con su conversación más reciente' })
  @Roles(OrganizationRoleType.HITL, OrganizationRoleType.OWNER, OrganizationRoleType.USER)
  @ApiBearerAuth()
  @Get('organization/:organizationId')
  async getChatUsersByOrganization(@GetUser() user: User, @Param('organizationId', ParseIntPipe) organizationId: number, @Query() searchParams: ChatUsersOrganizationDto) {
    const result = await this.chatUserService.findChatUsersByOrganizationWithLastConversation(organizationId, user, searchParams);
    return result;
  }
}
