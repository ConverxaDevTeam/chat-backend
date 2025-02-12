import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacebookService } from './facebook.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';
import { CreateIntegrationMessagerDto } from './dto/create-integration-messager.dto';
import { ConfigService } from '@nestjs/config';
import { FacebookType, WebhookFacebookDto } from './dto/webhook-facebook.dto';

@Controller('facebook')
@ApiTags('facebook')
export class FacebookController {
  constructor(
    private readonly facebookService: FacebookService,

    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Whastapp Integration' })
  @ApiBearerAuth()
  @Post('create/:organizationId/:departamentoId')
  async createIntegrationWhatsApp(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Body() createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto,
  ) {
    const integration = await this.facebookService.createIntegrationWhatsApp(user, createIntegrationWhatsAppDto, organizationId, departamentoId);

    return {
      ok: true,
      integration: integration,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Messager Integration' })
  @ApiBearerAuth()
  @Post('create-messager/:organizationId/:departamentoId')
  async createIntegrationMessager(
    @GetUser() user: User,
    @Param('organizationId') organizationId: number,
    @Param('departamentoId') departamentoId: number,
    @Body() createIntegrationMessagerDto: CreateIntegrationMessagerDto,
  ) {
    const integration = await this.facebookService.createIntegrationMessager(user, createIntegrationMessagerDto, organizationId, departamentoId);

    return {
      ok: true,
      integration: integration,
    };
  }

  @ApiOperation({ summary: 'Get Webhook' })
  @Get('webhook')
  async getWebhook(@Query('hub.verify_token') verifyToken: string, @Query('hub.challenge') challenge: string, @Query('hub.mode') mode: string, @Res() res) {
    console.log('on get webhook');
    if (mode === 'subscribe' && verifyToken === this.configService.get<string>('facebook.webhookSecret')) {
      return res.status(200).send(challenge);
    }

    throw new HttpException('Authentication failed. Invalid Token.', HttpStatus.UNAUTHORIZED);
  }

  @ApiOperation({ summary: 'Post Webhook' })
  @Post('webhook')
  async postWebhook(@Body() webhookFacebookDto: WebhookFacebookDto, @Res() res) {
    if (webhookFacebookDto.object === FacebookType.PAGE) {
      console.log('Received Messenger event');
      this.facebookService.analyzefacebookmessage(webhookFacebookDto);
    } else if (webhookFacebookDto.object === FacebookType.WHATSAPP_BUSINESS_ACCOUNT) {
      if (!webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages) return;
      console.log('Received whatsapp event', JSON.stringify(webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages));
      this.facebookService.analyzeWhatsAppMessage(webhookFacebookDto);
    } else {
      console.log('Invalid object');
    }
    return res.status(200).send('EVENT_RECEIVED');
  }
}
