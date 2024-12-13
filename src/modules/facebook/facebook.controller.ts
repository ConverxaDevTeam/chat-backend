import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacebookService } from './facebook.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { WebhookWhatsAppDto } from './dto/webhook.dto';
import { IntegrationService } from '@modules/integration/integration.service';
import { ConversationService } from '@modules/conversation/conversation.service';
import { Conversation } from '@models/Conversation.entity';
import { MessageService } from '@modules/message/message.service';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';
import { AgentService } from '@modules/agent/agentServer';

@Controller('facebook')
@ApiTags('facebook')
export class FacebookController {
  constructor(
    private readonly facebookService: FacebookService,
    private readonly integrationService: IntegrationService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly agentService: AgentService,
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

  @ApiOperation({ summary: 'Get Webhook' })
  @Get('webhook/:integrationId/api')
  async getWebhook(@Query('hub.verify_token') verifyToken: string, @Query('hub.challenge') challenge: string, @Query('hub.mode') mode: string, @Res() res) {
    console.log('verifyToken', verifyToken);
    if (mode === 'subscribe') {
      return res.status(200).send(challenge);
    }

    throw new HttpException('Authentication failed. Invalid Token.', HttpStatus.UNAUTHORIZED);
  }

  @ApiOperation({ summary: 'Create Whastapp Integration' })
  @Post('webhook/:integrationId/api')
  async webhookWhatsApp(@Param('integrationId') integrationId: number, @Body() webhookWhatsAppDto: WebhookWhatsAppDto) {
    if (!webhookWhatsAppDto.entry[0].changes[0].value.messages) {
      return {
        ok: false,
        message: 'No messages',
      };
    }

    const phoneNumber = webhookWhatsAppDto.entry[0].changes[0].value.messages[0].from;

    if (!phoneNumber) {
      return {
        ok: false,
        message: 'No phone number',
      };
    }

    const integration = await this.integrationService.getIntegrationWhatsAppById(integrationId);

    if (!integration) {
      return {
        ok: false,
        message: 'Integration not found',
      };
    }
    let actualConversation: Conversation;

    const conversation = await this.conversationService.getConversationByIntegrationIdAndByPhoneNumber(integration.id, phoneNumber);

    if (!conversation) {
      actualConversation = await this.conversationService.createConversationAndChatUser(integration, phoneNumber);
    } else {
      actualConversation = conversation;
    }

    const messageUser = await this.messageService.createMessageUserWhatsApp(actualConversation, webhookWhatsAppDto);

    if (!messageUser) {
      return {
        ok: false,
        message: 'Error creating message',
      };
    }
    await this.agentService.processMessageWithConversation(messageUser.text, actualConversation);

    return {
      ok: true,
    };
  }
}
