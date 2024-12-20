import { User } from '@models/User.entity';
import { BadRequestException, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CreateIntegrationWhatsAppDto } from './dto/create-integration-whats-app.dto';
import { IntegrationService } from '@modules/integration/integration.service';
import { CreateIntegrationMessagerDto } from './dto/create-integration-messager.dto';
import { OrganizationRoleType } from '@models/UserOrganization.entity';
import { OrganizationService } from '@modules/organization/organization.service';
import { DepartmentService } from '@modules/department/department.service';
import { WebhookFacebookDto } from './dto/webhook-facebook.dto';
import { MessagerService } from './messager.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';
import { SocketService } from '@modules/socket/socket.service';
import { MessageService } from '@modules/message/message.service';
import { ConversationService } from '@modules/conversation/conversation.service';
import { Conversation, ConversationType } from '@models/Conversation.entity';
import { Message, MessageFormatType, MessageType } from '@models/Message.entity';
import { IntegrationType } from '@models/Integration.entity';
import { ChatUserType } from '@models/ChatUser.entity';

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationService: IntegrationService,
    private readonly organizationService: OrganizationService,
    private readonly departmentService: DepartmentService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly integrationRouterService: IntegrationRouterService,
    private readonly messagerService: MessagerService,
  ) {}

  async createIntegrationWhatsApp(user: User, createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto, organizationId: number, departamentoId: number) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${createIntegrationWhatsAppDto.code}`,
      );
      const accessToken = response.data.access_token;

      if (!accessToken) {
        throw new Error('Failed to exchange code for token');
      }

      const integration = await this.integrationService.createIntegrationWhatsApp(user, organizationId, departamentoId, createIntegrationWhatsAppDto, accessToken);

      await axios.delete(`https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      await axios.post(
        `https://graph.facebook.com/v21.0/${createIntegrationWhatsAppDto.waba_id}/subscribed_apps`,
        {
          callback_url: `${this.configService.get<string>('url.web_hook_whatsapp')}/api/facebook/webhook/${integration.id}/api`,
          verify_token: accessToken,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return integration;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.response?.data);
      }
      throw new Error('Failed to create integration');
    }
  }

  async createIntegrationMessager(user: User, createIntegrationMessagerDto: CreateIntegrationMessagerDto, organizationId: number, departamentoId: number) {
    const rolInOrganization = await this.organizationService.getRolInOrganization(user, organizationId);

    const allowedRoles = [OrganizationRoleType.ADMIN, OrganizationRoleType.OWNER, OrganizationRoleType.USER];
    if (!allowedRoles.includes(rolInOrganization)) {
      throw new BadRequestException('No tienes permisos para crear la integración');
    }

    const departamento = await this.departmentService.getDepartmentByOrganizationAndDepartmentId(organizationId, departamentoId);

    if (!departamento) {
      throw new BadRequestException(`El departamento con ID ${departamentoId} no existe en la organización con ID ${organizationId}`);
    }

    const response = await axios.get(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${createIntegrationMessagerDto.code}`,
    );
    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new BadRequestException('Failed to exchange code for token');
    }

    const pagesResponse = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: accessToken },
    });

    const pageOneId = pagesResponse.data.data[0].id;
    const pageOneToken = pagesResponse.data.data[0].access_token;

    if (!pageOneId || !pageOneToken) {
      throw new BadRequestException('Failed to get page id or token');
    }
    const searchIntegration = await this.integrationService.getIntegrationMessagerByPageId(pageOneId);

    if (searchIntegration) {
      throw new BadRequestException('Integration already exists');
    }

    const responseSucribed = await axios.post(
      `https://graph.facebook.com/v21.0/${pageOneId}/subscribed_apps`,
      {
        subscribed_fields: ['messages', 'messaging_postbacks'],
      },
      {
        params: {
          access_token: pageOneToken,
        },
      },
    );

    if (!responseSucribed.data.success) {
      throw new BadRequestException('Failed to subscribe');
    }

    const integration = await this.integrationService.createIntegrationMessager(departamento, pageOneId, pageOneToken);

    return integration;
  }

  async analyzefacebookmessage(webhookFacebookDto: WebhookFacebookDto) {
    try {
      const pageId = webhookFacebookDto.entry[0].id;
      const integration = await this.integrationService.getIntegrationMessagerByPageId(pageId);

      if (!integration) {
        console.log(`Integration not found - pageId: ${pageId}`);
        return;
      }
      if (!webhookFacebookDto.entry[0] || !webhookFacebookDto.entry[0].messaging) {
        console.log('Invalid object', webhookFacebookDto.entry);
        return;
      }
      const senderId = webhookFacebookDto.entry[0].messaging[0].sender.id;
      if (!senderId) {
        console.log('Invalid object', webhookFacebookDto.entry[0].messaging[0].sender);
        return;
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
        console.log('Invalid object', webhookFacebookDto);
        return;
      }

      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, message);

      const response = await this.integrationRouterService.processMessage(message.text, actualConversation.id);
      if (!response) return;
      const messageAi = await this.socketService.sendMessageToUser(actualConversation, response.message, message.format);
      if (!messageAi) return;

      if (messageAi.format === MessageFormatType.AUDIO) {
        this.messagerService.sendFacebookMessageAudio(senderId, messageAi.audio, integration.token);
      } else {
        this.messagerService.sendFacebookMessage(senderId, messageAi.text, integration.token);
      }
      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, messageAi);
    } catch (error) {
      console.log('Error', error);
    }
  }
}
