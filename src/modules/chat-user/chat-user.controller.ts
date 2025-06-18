import { Controller, Get, Put, Param, Body, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { ChatUserService } from './chat-user.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ChatUserType } from '@models/ChatUser.entity';

@Controller('chat-user')
@ApiTags('chat-user')
export class ChatUserController {
  constructor(private readonly chatUserService: ChatUserService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener listado de todos los usuarios de chat con información completa' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de usuarios por página (default: 10)' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'ID de la organización para filtrar usuarios' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, email o teléfono' })
  @ApiQuery({ name: 'type', required: false, enum: ChatUserType, description: 'Filtrar por tipo de usuario' })
  @ApiBearerAuth()
  @Get('all/info')
  async getAllUsersInfo(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Query('type') type?: ChatUserType,
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const orgId = organizationId ? parseInt(organizationId, 10) : undefined;

    const result = await this.chatUserService.getAllUsersWithInfo(pageNumber, limitNumber, orgId, search, type);
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
  @ApiOperation({ summary: 'Actualizar información del usuario de chat (solo administradores)' })
  @ApiBearerAuth()
  @Put(':id/info')
  async updateUserInfo(@Param('id', ParseIntPipe) id: number, @Body() updateData: { field: string; value: string }) {
    const { field, value } = updateData;

    // Campos estándar que se pueden actualizar directamente
    const standardFields = ['name', 'email', 'phone', 'address', 'avatar'];

    if (standardFields.includes(field)) {
      const updatedUser = await this.chatUserService.updateUserInfo(id, field, value);
      return {
        ok: true,
        message: `Campo ${field} actualizado correctamente`,
        data: updatedUser,
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
}
