import { User } from '@models/User.entity';
import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { Integration } from '@models/Integration.entity';
import { join } from 'path';
import * as fs from 'fs';
import * as uuid from 'uuid';

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
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  private async getAccessToken(code: string): Promise<string> {
    const response = await axios.get<{ access_token: string }>(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${code}`,
    );

    if (!response.data.access_token) {
      throw new BadRequestException('Failed to exchange code for token');
    }

    return response.data.access_token;
  }

  private async subscribeToWebhook(wabaId: string, integrationId: number, accessToken: string): Promise<void> {
    await axios.delete(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const webhookUrl = `${this.configService.get<string>('url.web_hook_whatsapp')}/api/facebook/webhook/${integrationId}/api`;

    await axios.post(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      {
        callback_url: webhookUrl,
        verify_token: accessToken,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private async registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<string> {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const response = await axios.post<{ success: boolean }>(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
      {
        messaging_product: 'whatsapp',
        pin,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.data.success) {
      throw new BadRequestException('Failed to register phone number');
    }

    return pin;
  }

  private async sendTestMessage(phoneNumberId: string, accessToken: string): Promise<void> {
    const response = await axios.post<{
      messaging_product: string;
      contacts: Array<{ input: string; wa_id: string }>;
      messages: Array<{ id: string }>;
    }>(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumberId,
        type: 'text',
        text: {
          body: 'Test message from Sofia Chat: Phone number registered successfully!',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.data.messages?.[0]?.id) {
      throw new BadRequestException('Failed to send test message');
    }
  }

  async createIntegrationWhatsApp(user: User, createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto, organizationId: number, departamentoId: number): Promise<Integration> {
    return await this.connection.transaction(async (entityManager) => {
      try {
        const accessToken = await this.getAccessToken(createIntegrationWhatsAppDto.code);
        const pin = await this.registerPhoneNumber(createIntegrationWhatsAppDto.phone_number_id, accessToken);

        // Validate all external services before saving
        // await this.sendTestMessage(createIntegrationWhatsAppDto.phone_number_id, accessToken);

        // Only save if all validations pass
        const integration = await entityManager.getRepository(Integration).save({
          user,
          organizationId,
          departamentoId,
          ...createIntegrationWhatsAppDto,
          config: JSON.stringify({ pin }),
          token: accessToken,
          type: IntegrationType.WHATSAPP,
        });

        await this.subscribeToWebhook(createIntegrationWhatsAppDto.waba_id, integration.id, accessToken);

        return integration;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          this.logger.error(`Facebook API error: ${error.response?.data?.message || error.message}`);
          throw new BadRequestException(error.response?.data?.message || 'Facebook API error');
        } else {
          console.log(error);
        }
        throw new InternalServerErrorException(error);
      }
    });
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

    const pageOneId = pagesResponse.data.data[0]?.id;
    const pageOneToken = pagesResponse.data.data[0]?.access_token;

    if (!pageOneId || !pageOneToken) {
      console.log(pagesResponse.data);
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

  async analyzeWhatsAppMessage(webhookFacebookDto: WebhookFacebookDto) {
    try {
      const phone = await this.getPhoneByNumberPhone(webhookFacebookDto);
      if (!phone) {
        throw new BadRequestException('Phone number not found');
      }
      const wabaId = webhookFacebookDto.entry ? webhookFacebookDto.entry[0].id : null;
      if (!wabaId) {
        throw new BadRequestException('WabaId not found');
      }
      const integration = await this.integrationService.getIntegrationByphoneNumberId(wabaId);

      if (!integration) {
        throw new BadRequestException('Integration not found');
      }

      let actualConversation: Conversation;

      const conversation = await this.conversationService.getConversationByIntegrationIdAndByIdentified(integration.id, phone, IntegrationType.WHATSAPP);

      if (!conversation) {
        actualConversation = await this.conversationService.createConversationAndChatUserWhatsApp(integration, phone, webhookFacebookDto);
      } else {
        actualConversation = conversation;
      }

      if (webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type === 'text' && webhookFacebookDto.entry[0].changes[0].value.messages[0].text?.body) {
        const text = webhookFacebookDto.entry[0].changes[0].value.messages[0].text?.body;

        const message = await this.messageService.createMessage(actualConversation, text, MessageType.USER);
        this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, message);
        const response = await this.integrationRouterService.processMessage(text, actualConversation.id);
        if (!response) return;
        const messageAi = await this.socketService.sendMessageToUser(actualConversation, response.message, message.format);
        if (!messageAi) return;
      } else if (webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type === 'image' && webhookFacebookDto.entry[0].changes[0].value.messages[0].image) {
      } else if (webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type === 'audio') {
        const mediaResponse = await axios({
          method: 'get',
          url: `https://graph.facebook.com/v20.0/${webhookFacebookDto.entry[0].changes[0].value.messages[0].audio?.id}`,
          headers: {
            Authorization: `Bearer ${integration.token}`,
          },
        });
        const audioResponse = await axios.get(mediaResponse.data.url, {
          responseType: 'stream',
          headers: {
            Authorization: `Bearer ${integration.token}`,
          },
        });
        const uniqueName = `${uuid.v4()}.ogg`;
        const audioPath = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio', uniqueName);
        const writer = fs.createWriteStream(audioPath);
        audioResponse.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', () => resolve());
          writer.on('error', reject);
        });
        const message = await this.messageService.createMessage(actualConversation, '', MessageType.USER, {
          platform: IntegrationType.WHATSAPP,
          format: MessageFormatType.AUDIO,
          audio_url: uniqueName,
        });
        this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, message);
        const response = await this.integrationRouterService.processMessage(message.text, actualConversation.id);
        if (!response) return;
        const messageAi = await this.socketService.sendMessageToUser(actualConversation, response.message, message.format);
        if (!messageAi) return;
        this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, messageAi);
      } else {
        throw new BadRequestException('Message type not found');
      }
    } catch (error) {
      console.log('Error', error);
    }
  }

  async getPhoneByNumberPhone(webhookFacebookDto: WebhookFacebookDto): Promise<string> {
    const phoneNumber = webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ?? null;
    if (!phoneNumber) {
      throw new Error('Phone number not found');
    }

    return phoneNumber;
  }
}
