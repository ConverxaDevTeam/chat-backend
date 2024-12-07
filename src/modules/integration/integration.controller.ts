import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { IntegrationService } from './integration.service';
import { UpdateIntegrationWebChatDataDto } from './dto/update-integration-web-chat.dto';

@Controller('integration')
@ApiTags('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtiene la integración de web chat' })
  @ApiBearerAuth()
  @Get('web-chat/:organizationId/:departamentoId')
  async getIntegrationWebChat(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('departamentoId') departamentoId: number) {
    const integration = await this.integrationService.getIntegrationWebChat(user, organizationId, departamentoId);
    const integrationConfig = JSON.parse(integration.config);

    const integrationFormatted = {
      ...integration,
      config: integrationConfig,
    };

    return {
      ok: true,
      integration: integrationFormatted,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'actualizar integracion web' })
  @ApiBearerAuth()
  @Post('web-chat/:integrationId')
  async updateIntegrationWebChat(@GetUser() user: User, @Body() updateIntegrationWebChatDataDto: UpdateIntegrationWebChatDataDto, @Param('integrationId') integrationId: number) {
    const integration = await this.integrationService.updateIntegrationWebChatByUserIdAndbyIntegrationId(user, integrationId, updateIntegrationWebChatDataDto);
    const integrationConfig = JSON.parse(integration.config);

    const integrationFormatted = {
      ...integration,
      config: integrationConfig,
    };

    return {
      ok: true,
      integration: integrationFormatted,
    };
  }
}
