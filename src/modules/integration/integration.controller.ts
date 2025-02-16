import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { IntegrationService } from './integration.service';
import { UpdateIntegrationWebChatDataDto } from './dto/update-integration-web-chat.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';

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
    const integration = await this.integrationService.deleteIntegrationById(user, integrationId);
    const integrationConfig = JSON.parse(integration.config);

    return {
      ok: true,
      integration: {
        ...integration,
        config: integrationConfig,
      },
    };
  }
}
