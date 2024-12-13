import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { IntegrationService } from './integration.service';
import { UpdateIntegrationWebChatDataDto } from './dto/update-integration-web-chat.dto';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';

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
  @ApiOperation({ summary: 'Obtiene todas las integraciones' })
  @ApiBearerAuth()
  @Get('all/:organizationId/:departamentoId')
  async getAllIntegrations(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('departamentoId') departamentoId: number) {
    const integrations = await this.integrationService.getAllIntegrations(user, organizationId, departamentoId);
    const integrationsConfig = integrations.map((integration) => {
      return JSON.parse(integration.config);
    });

    const integrationsFormatted = integrations.map((integration, index) => {
      return {
        ...integration,
        config: integrationsConfig[index],
      };
    });

    return {
      ok: true,
      integrations: integrationsFormatted,
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'actualizar integracion web' })
  @ApiBearerAuth()
  @Post('whatsapp/:organizationId/:departamentoId')
  async createIntegrationWhatsApp(
    @GetUser() user: User,
    @Body() createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
  ) {
    const integration = await this.integrationService.createIntegrationWhatsApp(user, organizationId, departamentoId, createIntegrationWhatsAppDto.token);
    return {
      ok: true,
      integration: integration,
    };
  }
}
