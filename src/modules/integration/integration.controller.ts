import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { IntegrationService } from './integration.service';
import { UpdateIntegrationWebChatDataDto } from './dto/update-integration-web-chat.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { ChangeChannelNameSlackDto } from './dto/change-channel-name.dto';
import { UpdateIntegrationMessengerManualDto } from '@modules/facebook/dto/update-integration-messager-manual.dto';
import { IntegrationType } from '@models/Integration.entity';
import { UpdateIntegrationWhatsAppManualDto } from '@modules/facebook/dto/update-integration-whatsapp-manual.dto';

@Controller('integration')
@ApiTags('integration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @ApiOperation({ summary: 'Obtiene la integración de web chat' })
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

  @ApiOperation({ summary: 'Obtiene todas las integraciones' })
  @Get('all/:departamentoId')
  async getAllIntegrations(@GetUser() user: User, @Param('departamentoId') departamentoId: number) {
    const integrations = await this.integrationService.getAllIntegrations(user, departamentoId);
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

  @ApiOperation({ summary: 'actualizar integracion web' })
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

  @Post(':integrationId/logo')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Actualizar logo de la integración' })
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed!'), false);
        }
        callback(null, true);
      },
    }),
  )
  async updateIntegrationLogo(@GetUser() user: User, @Param('integrationId', ParseIntPipe) integrationId: number, @UploadedFile() file: Express.Multer.File) {
    const integration = await this.integrationService.updateIntegrationLogo(user, integrationId, file);
    const integrationConfig = JSON.parse(integration.config);

    return {
      ok: true,
      integration: {
        ...integration,
        config: integrationConfig,
      },
    };
  }

  @Delete(':integrationId/logo')
  @ApiOperation({ summary: 'Eliminar logo de la integración' })
  async deleteIntegrationLogo(@GetUser() user: User, @Param('integrationId', ParseIntPipe) integrationId: number) {
    const integration = await this.integrationService.deleteIntegrationLogo(user, integrationId);
    const integrationConfig = JSON.parse(integration.config);

    return {
      ok: true,
      integration: {
        ...integration,
        config: integrationConfig,
      },
    };
  }

  @Delete(':integrationId/remove')
  @ApiOperation({ summary: 'Eliminar logo de la integración' })
  async deleteIntegrationById(@GetUser() user: User, @Param('integrationId', ParseIntPipe) integrationId: number) {
    await this.integrationService.deleteIntegrationById(user, integrationId);

    return {
      ok: true,
    };
  }

  @ApiOperation({ summary: 'Obtiene la integración de slack' })
  @Get('get-channel-name/:organizationId/:departamentoId/:integrationId')
  async getChannelNameByIntegrationId(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('integrationId') integrationId: number,
  ) {
    const name = await this.integrationService.getChannelNameByIntegrationId(user, organizationId, departamentoId, integrationId);

    return {
      ok: true,
      name,
    };
  }

  @ApiOperation({ summary: 'Obtiene la integración de web chat' })
  @Post('change-channel-name/:organizationId/:departamentoId/:integrationId')
  async changeChannelName(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('integrationId') integrationId: number,
    @Body() changeChannelNameSlackDto: ChangeChannelNameSlackDto,
  ) {
    await this.integrationService.changeChannelNameSlack(user, organizationId, departamentoId, integrationId, changeChannelNameSlackDto.name);
    return {
      ok: true,
    };
  }

  @ApiOperation({ summary: 'crear integración de messager manual' })
  @Post('create-messager-manual/:organizationId/:departamentoId')
  async createIntegrationMessagerManual(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('departamentoId') departamentoId: number) {
    await this.integrationService.createIntegrationManual(user, organizationId, departamentoId, IntegrationType.MESSENGER_MANUAL);
    return {
      ok: true,
    };
  }

  @ApiOperation({ summary: 'crear integración de messager manual' })
  @Post('create-whatsapp-manual/:organizationId/:departamentoId')
  async createIntegrationWhatsAppManual(@GetUser() user: User, @Param('organizationId') organizationId: number, @Param('departamentoId') departamentoId: number) {
    await this.integrationService.createIntegrationManual(user, organizationId, departamentoId, IntegrationType.WHATSAPP_MANUAL);
    return {
      ok: true,
    };
  }

  @ApiOperation({ summary: 'get integración de messager manual' })
  @Get('get-messenger-manual/:organizationId/:departamentoId/:id')
  async getIntegrationMessengerManual(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('id') id: number,
  ) {
    const integration = await this.integrationService.getIntegrationMessengerManual(user, organizationId, departamentoId, id);
    return {
      ok: true,
      integration,
    };
  }

  @ApiOperation({ summary: 'get integración de messager manual' })
  @Get('get-whatsapp-manual/:organizationId/:departamentoId/:id')
  async getIntegrationWhatsAppManual(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('id') id: number,
  ) {
    const integration = await this.integrationService.getIntegrationWhatsAppManual(user, organizationId, departamentoId, id);
    return {
      ok: true,
      integration,
    };
  }

  @ApiOperation({ summary: 'cambiar code_webhook de integracion manual' })
  @Post('change-manual-code/:organizationId/:departamentoId/:id')
  async changeCodeIntegrationManual(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('id') id: number,
  ) {
    const code = await this.integrationService.changeCodeIntegrationManual(user, organizationId, departamentoId, id);
    return {
      ok: true,
      code_webhook: code,
    };
  }

  @ApiOperation({ summary: 'update de messager manual' })
  @Post('update-messenger-manual/:organizationId/:departamentoId/:id')
  async updateIntegrationMessengerManual(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('id') id: number,
    @Body() updateIntegrationMessengerManualDto: UpdateIntegrationMessengerManualDto,
  ) {
    const integration = await this.integrationService.updateIntegrationMessengerManual(user, organizationId, departamentoId, id, updateIntegrationMessengerManualDto);
    return {
      ok: true,
      integration,
    };
  }

  @ApiOperation({ summary: 'update de messager manual' })
  @Post('update-whatsapp-manual/:organizationId/:departamentoId/:id')
  async updateIntegrationWhatsAppManual(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Param('id') id: number,
    @Body() updateIntegrationWhatsAppManualDto: UpdateIntegrationWhatsAppManualDto,
  ) {
    const integration = await this.integrationService.updateIntegrationWhatsAppManual(user, organizationId, departamentoId, id, updateIntegrationWhatsAppManualDto);
    return {
      ok: true,
      integration,
    };
  }
}
