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
import { IntegrationRouterService } from '../integration-router/integration.router.service';
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
import * as uuid from 'uuid';
import { GetPagesDto } from './dto/get-pages.dto';
import * as fs from 'fs';
import { WhatsAppService } from './whatsapp.service';

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
    private readonly whatsAppService: WhatsAppService,
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
    console.log('on subscribeToWebhook');
    try {
      await axios.delete(`https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.log(error.response.data.error.message);
    }
    const webhookUrl = `${this.configService.get<string>('url.web_hook_whatsapp')}/api/facebook/webhook/${integrationId}/api`;
    try {
      console.log('on subscribeToWebhook', webhookUrl, accessToken, wabaId);
      const response = await axios.post(
        `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
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
      console.log(response.data);
    } catch (error) {
      console.log(error.response.data.error.message);
    }
  }

  private async registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<string> {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(pin);

    const response = await axios.post<{ success: boolean }>(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/register`,
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
      console.log('on pin error', response.data);
      throw new BadRequestException('Failed to register phone number');
    }
    return pin;
  }

  async createIntegrationWhatsApp(user: User, createIntegrationWhatsAppDto: CreateIntegrationWhatsAppDto, organizationId: number, departamentoId: number): Promise<Integration> {
    return await this.connection.transaction(async (entityManager) => {
      try {
        console.log('*'.repeat(50));
        console.log('on create integration whatsapp');
        const accessToken = await this.getAccessToken(createIntegrationWhatsAppDto.code);
        console.log('after accessToken');
        const pin = await this.registerPhoneNumber(createIntegrationWhatsAppDto.phone_number_id, accessToken);
        console.log('after pin');

        // Validate all external services before saving
        // await this.sendTestMessage(createIntegrationWhatsAppDto.phone_number_id, accessToken);
        console.log('saving integration', departamentoId);
        // Only save if all validations pass
        const integration = await entityManager.getRepository(Integration).save({
          user,
          departamento: {
            id: departamentoId,
          },
          ...createIntegrationWhatsAppDto,
          config: JSON.stringify({ pin }),
          token: accessToken,
          type: IntegrationType.WHATSAPP,
        });

        await this.subscribeToWebhook(createIntegrationWhatsAppDto.waba_id, integration.id, accessToken);

        return integration;
      } catch (error) {
        console.log(error.response?.data);
        if (axios.isAxiosError(error)) {
          // Detectar errores específicos de permisos de Facebook
          const errorData = error.response?.data;
          const errorMessage = errorData?.error?.message || error.message;
          const errorCode = errorData?.error?.code;
          const errorType = errorData?.error?.type;

          this.logger.error(`Facebook API error: ${errorMessage}, code: ${errorCode}, type: ${errorType}`);

          // Errores específicos de permisos
          if (
            errorCode === 190 || // Token inválido o expirado
            errorCode === 200 || // Permisos insuficientes
            errorType === 'OAuthException' || // Problema de autenticación OAuth
            errorMessage.includes('permission') || // Mensaje incluye 'permission'
            errorMessage.includes('access') || // Mensaje incluye 'access'
            errorMessage.includes('unauthorized') // Mensaje incluye 'unauthorized'
          ) {
            throw new BadRequestException({
              message: errorMessage || 'Error de permisos de Facebook',
              code: errorCode,
              type: errorType,
              isPermissionError: true,
            });
          }

          throw new BadRequestException({
            message: errorMessage || 'Facebook API error',
            code: errorCode,
            type: errorType,
          });
        } else {
          console.log(error);
          throw new InternalServerErrorException({
            message: error.message || 'Error interno del servidor',
            isPermissionError: false,
          });
        }
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
    // const debugResponse = await axios({
    //   method: 'get',
    //   url: `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${this.configService.get<string>('facebook.token')}`,
    // });

    // console.log('debugResponse', debugResponse.data);
    const searchIntegration = await this.integrationService.getIntegrationMessagerByPageId(createIntegrationMessagerDto.id);

    if (searchIntegration) {
      throw new BadRequestException('La integración ya existe');
    }

    const responseSucribed = await axios.post(
      `https://graph.facebook.com/v22.0/${createIntegrationMessagerDto.id}/subscribed_apps`,
      {
        subscribed_fields: ['messages', 'messaging_postbacks'],
      },
      {
        params: {
          access_token: createIntegrationMessagerDto.access_token,
        },
      },
    );

    if (!responseSucribed.data.success) {
      throw new BadRequestException('Failed to subscribe');
    }

    const integration = await this.integrationService.createIntegrationMessager(departamento, createIntegrationMessagerDto.id, createIntegrationMessagerDto.access_token);

    return integration;
  }

  async getPagesFacebook(user: User, getPagesDto: GetPagesDto, organizationId: number, departamentoId: number) {
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
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${this.configService.get<string>('facebook.appId')}&client_secret=${this.configService.get<string>('facebook.appSecret')}&code=${getPagesDto.code}`,
    );
    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new BadRequestException('Failed to exchange code for token');
    }

    const pagesResponse = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      params: { access_token: accessToken },
    });

    return pagesResponse.data.data;
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
        message = await this.messageService.createMessage(actualConversation, text, MessageType.USER, integration.departamento.organizacion.id, actualConversation?.user?.id);
      } else if (
        !text &&
        webhookFacebookDto.entry[0].messaging[0].message.attachments[0].type === 'audio' &&
        webhookFacebookDto.entry[0].messaging[0].message.attachments[0].payload.url
      ) {
        message = await this.messageService.createMessage(actualConversation, '', MessageType.USER, integration.departamento.organizacion.id, actualConversation?.user?.id, {
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
      const messageAi = await this.socketService.sendMessageToUser(
        actualConversation,
        response.message,
        message.format,
        MessageType.AGENT,
        integration.departamento.organizacion.id,
      );
      if (!messageAi) return;

      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, messageAi);
    } catch (error) {
      console.log('Error', error);
    }
  }

  private async createWhatsAppMessage(messageType: string, webhookFacebookDto: WebhookFacebookDto, actualConversation: Conversation, integration: Integration): Promise<Message> {
    if (messageType === 'text' && webhookFacebookDto.entry[0].changes?.[0].value.messages[0].text?.body) {
      const text = webhookFacebookDto.entry[0].changes[0].value.messages[0].text?.body;
      return await this.messageService.createMessage(actualConversation, text, MessageType.USER, integration.departamento.organizacion.id, actualConversation?.user?.id);
    }

    if (messageType === 'image' && webhookFacebookDto.entry[0].changes?.[0].value.messages[0].image) {
      const image = webhookFacebookDto.entry[0].changes[0].value.messages[0].image;
      try {
        const mediaResponse = await axios({
          method: 'get',
          url: `https://graph.facebook.com/v20.0/${image.id}`,
          headers: {
            Authorization: `Bearer ${integration.token}`,
          },
        });
        const imageUrl = mediaResponse.data.url;
        const imageResponse = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'arraybuffer',
          headers: {
            Authorization: `Bearer ${integration.token}`,
          },
        });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        const [savedImageUrl] = await this.integrationRouterService.saveImages([
          {
            buffer: imageBuffer,
            originalname: `${image.id}.jpg`,
          } as Express.Multer.File,
        ]);

        return await this.messageService.createMessage(
          actualConversation,
          image.caption || '',
          MessageType.USER,
          integration.departamento.organizacion.id,
          actualConversation?.user?.id,
          {
            platform: IntegrationType.WHATSAPP,
            format: MessageFormatType.IMAGE,
            images: [savedImageUrl],
          },
        );
      } catch (error) {
        console.error('Error fetching image URL:', error.response?.data || error.message);
        throw new Error('Failed to fetch image URL');
      }
    }

    if (messageType === 'audio') {
      const mediaResponse = await axios({
        method: 'get',
        url: `https://graph.facebook.com/v20.0/${webhookFacebookDto.entry[0].changes?.[0].value.messages[0].audio?.id}`,
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
      return await this.messageService.createMessage(actualConversation, '', MessageType.USER, integration.departamento.organizacion.id, actualConversation?.user?.id, {
        platform: IntegrationType.WHATSAPP,
        format: MessageFormatType.AUDIO,
        audio_url: uniqueName,
      });
    }

    throw new BadRequestException('Message type not found');
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
      const messageType = webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type;
      if (!messageType) {
        throw new BadRequestException('Message type is undefined');
      }
      const message = await this.createWhatsAppMessage(messageType, webhookFacebookDto, actualConversation, integration);
      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, message);
      const response = await this.integrationRouterService.processMessage(message.text, actualConversation.id, message.images);
      if (!response) return;
      const messageAi = await this.socketService.sendMessageToUser(
        actualConversation,
        response.message,
        message.format,
        MessageType.AGENT,
        integration.departamento.organizacion.id,
      );
      if (!messageAi) return;
      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, messageAi);
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

  async testing(code: string) {
    try {
      const accessToken = await this.getAccessTokenTest(code);

      console.log('accessToken', accessToken);

      // if (!accessToken) {
      //   return;
      // }

      // const debugResponse = await axios({
      //   method: 'get',
      //   url: `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${this.configService.get<string>('facebook.token')}`,
      // });

      // console.log('debugResponse', debugResponse.data);

      // const pagesResponse = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
      //   params: { access_token: accessToken },
      // });

      // console.log('pagesResponse', pagesResponse.data);
    } catch (error) {
      console.log('Error', error.response.data);
    }
  }

  async getAccessTokenTest(code: string) {
    const url = `https://graph.facebook.com/v22.0/oauth/access_token`;

    const params = {
      client_id: this.configService.get<string>('facebook.appId'),
      client_secret: this.configService.get<string>('facebook.appSecret'),
      redirect_uri: 'https://mxvlu5nnqui9pcvi1x9mxi.webrelay.io/api/facebook/test"', // ⚠️ Debe ser el mismo
      code: code,
    };

    try {
      const response = await axios.get(url, { params });
      return response.data;
    } catch (error) {
      console.error('Error al obtener el access_token:', error.response?.data || error.message);
      throw error;
    }
  }

  async getCodeIntegrationManual(integrationId: number): Promise<string> {
    const integration = await this.integrationService.getIntegrationCodeById(integrationId);
    if (!integration) {
      throw new BadRequestException('Integration not found');
    }
    return integration;
  }

  async validateCodeIntegrationManual(integrationId: number, code: string): Promise<void> {
    await this.integrationService.validateCodeIntegrationManual(integrationId, code);
  }
}
