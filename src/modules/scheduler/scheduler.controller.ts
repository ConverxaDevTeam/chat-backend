import { Controller, Post, Param, UseGuards, ParseIntPipe, HttpStatus, HttpCode } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { JwtAuthRolesGuard } from '@modules/auth/guards/jwt-auth-roles.guard';
import { Roles } from '@infrastructure/decorators/role-protected.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('scheduler')
@Controller('scheduler')
@UseGuards(JwtAuthGuard, JwtAuthRolesGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('reset-conversation-count/:organizationId')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reinicia el contador de conversaciones para una organización específica' })
  @ApiResponse({ status: 200, description: 'Contador reiniciado con éxito' })
  @ApiResponse({ status: 400, description: 'La organización no es de tipo CUSTOM o no tiene límites mensuales' })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async resetConversationCount(@Param('organizationId', ParseIntPipe) organizationId: number) {
    return this.schedulerService.resetConversationCountForOrganization(organizationId);
  }
}
