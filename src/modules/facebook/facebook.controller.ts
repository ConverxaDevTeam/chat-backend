import { BadRequestException, Body, Controller, forwardRef, Get, HttpException, HttpStatus, Inject, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacebookService } from './facebook.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { GetUser } from '@infrastructure/decorators/get-user.decorator';
import { User } from '@models/User.entity';
import { IntegrationService } from '@modules/integration/integration.service';
import { ConversationService } from '@modules/conversation/conversation.service';
import { Conversation, ConversationType } from '@models/Conversation.entity';
import { MessageService } from '@modules/message/message.service';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';
import { CreateIntegrationMessagerDto } from './dto/create-integration-messager.dto';
import { ConfigService } from '@nestjs/config';
import { FacebookType, WebhookFacebookDto } from './dto/webhook-facebook.dto';
import { IntegrationType } from '@models/Integration.entity';
import { ChatUserType } from '@models/ChatUser.entity';
import { Message, MessageFormatType, MessageType } from '@models/Message.entity';
import { SocketService } from '@modules/socket/socket.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';
import { MessagerService } from './messager.service';

@Controller('facebook')
@ApiTags('facebook')
export class FacebookController {
  constructor(
    private readonly facebookService: FacebookService,
    private readonly integrationService: IntegrationService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly integrationRouterService: IntegrationRouterService,
    private readonly messagerService: MessagerService,
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
    if (mode === 'subscribe' && verifyToken === this.configService.get<string>('facebook.webhookSecret')) {
      return res.status(200).send(challenge);
    }

    throw new HttpException('Authentication failed. Invalid Token.', HttpStatus.UNAUTHORIZED);
  }

  @ApiOperation({ summary: 'Post Webhook' })
  @Post('webhook')
  async postWebhook(@Body() webhookFacebookDto: WebhookFacebookDto) {
    if (webhookFacebookDto.object === FacebookType.PAGE) {
      const pageId = webhookFacebookDto.entry[0].id;
      const integration = await this.integrationService.getIntegrationMessagerByPageId(pageId);

      if (!integration) {
        console.log(`Integration not found - pageId: ${pageId}`);
        return {
          ok: false,
          message: 'Integration not found',
        };
      }
      if (!webhookFacebookDto.entry[0] || !webhookFacebookDto.entry[0].messaging) {
        console.log('Invalid object', webhookFacebookDto.entry);
        return {
          ok: false,
          message: 'Invalid object',
        };
      }
      const senderId = webhookFacebookDto.entry[0].messaging[0].sender.id;
      if (!senderId) {
        throw new BadRequestException('Invalid object');
      }

      let actualConversation: Conversation;

      const conversation = await this.conversationService.getConversationByIntegrationIdAndByIdentified(integration.id, senderId, IntegrationType.MESSENGER);

      if (!conversation) {
        actualConversation = await this.conversationService.createConversationAndChatUser(integration, senderId, ConversationType.MESSENGER, ChatUserType.MESSENGER);
      } else {
        actualConversation = conversation;
      }

      const text = webhookFacebookDto.entry[0].messaging[0].message.text;

      let message: Message;
      if (text) {
        message = await this.messageService.createMessage(actualConversation, text, MessageType.USER);
      } else if (
        !text &&
        webhookFacebookDto.entry[0].messaging[0].message.attachments[0].type === 'audio' &&
        webhookFacebookDto.entry[0].messaging[0].message.attachments[0].payload.url
      ) {
        message = await this.messageService.createMessage(actualConversation, text, MessageType.USER, {
          platform: IntegrationType.MESSENGER,
          format: MessageFormatType.AUDIO,
          audio_url: webhookFacebookDto.entry[0].messaging[0].message.attachments[0].payload.url,
        });
      } else {
        new BadRequestException('Invalid object');
        return;
      }

      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, message);

      try {
        const response = await this.integrationRouterService.processMessage(message.text, actualConversation.id);
        if (!response) return;
        const messageAi = await this.socketService.sendMessageToUser(actualConversation, response.message);
        if (!messageAi) return;
        this.messagerService.sendFacebookMessage(senderId, messageAi.text, integration.token);
        this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, messageAi);
      } catch (error) {
        console.log('error:', error);
      }
      return {
        ok: true,
      };
    } else {
      throw new BadRequestException('Invalid object');
    }
  }

  // @ApiOperation({ summary: 'Create Whastapp Integration' })
  // @Post('webhook/:integrationId/api')
  // async webhookWhatsApp(@Param('integrationId') integrationId: number, @Body() webhookWhatsAppDto: WebhookWhatsAppDto) {
  //   if (!webhookWhatsAppDto.entry[0].changes[0].value.messages) {
  //     return {
  //       ok: false,
  //       message: 'No messages',
  //     };
  //   }

  //   const phoneNumber = webhookWhatsAppDto.entry[0].changes[0].value.messages[0].from;

  //   if (!phoneNumber) {
  //     return {
  //       ok: false,
  //       message: 'No phone number',
  //     };
  //   }

  //   const integration = await this.integrationService.getIntegrationFacebookById(integrationId, IntegrationType.WHATSAPP);

  //   if (!integration) {
  //     return {
  //       ok: false,
  //       message: 'Integration not found',
  //     };
  //   }
  //   let actualConversation: Conversation;

  //   const conversation = await this.conversationService.getConversationByIntegrationIdAndByIdentified(integration.id, phoneNumber, IntegrationType.WHATSAPP);

  //   if (!conversation) {
  //     actualConversation = await this.conversationService.createConversationAndChatUser(integration, phoneNumber, ConversationType.WHATSAPP, ChatUserType.WHATSAPP);
  //   } else {
  //     actualConversation = conversation;
  //   }

  //   const messageUser = await this.messageService.createMessageUserWhatsApp(actualConversation, webhookWhatsAppDto);

  //   if (!messageUser) {
  //     return {
  //       ok: false,
  //       message: 'Error creating message',
  //     };
  //   }
  //   await this.agentService.processMessageWithConversation(messageUser.text, actualConversation);

  //   return {
  //     ok: true,
  //   };
  // }
}
