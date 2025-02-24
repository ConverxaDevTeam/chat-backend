import { ChatUserType } from '@models/ChatUser.entity';
import { Conversation, ConversationType } from '@models/Conversation.entity';
import { IntegrationType } from '@models/Integration.entity';
import { MessageType } from '@models/Message.entity';
import { ConversationService } from '@modules/conversation/conversation.service';
import { DepartmentService } from '@modules/department/department.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';
import { IntegrationService } from '@modules/integration/integration.service';
import { MessageService } from '@modules/message/message.service';
import { SocketService } from '@modules/socket/socket.service';
import { forwardRef, Inject, Injectable, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SlackService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => IntegrationService))
    private readonly integrationService: IntegrationService,
    private readonly departmentService: DepartmentService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly integrationRouterService: IntegrationRouterService,
  ) {}

  async handleSlackAuth(@Query() query, @Res() res) {
    const { code, state } = query;

    if (!code) {
      return res.status(400).send('Error: Código no recibido');
    }

    try {
      const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
        params: {
          client_id: this.configService.get<string>('slack.clientId'),
          client_secret: this.configService.get<string>('slack.clientSecret'),
          code,
          redirect_uri: this.configService.get<string>('slack.redirectUri'),
        },
      });

      const data = response.data;

      if (!data.authed_user.id || !data.access_token || !data.team.id || !data.team.name || !data.refresh_token || !data.bot_user_id) {
        return res.send(`
          <script>
            window.opener.postMessage({ success: false, message: 'Error en la autenticación de Slack' }, "*");
            window.close();
          </script>
        `);
      }

      const metadata = JSON.parse(Buffer.from(state, 'base64').toString());
      if (!metadata.department_id) {
        return res.send(`
          <script>
            window.opener.postMessage({ success: false, message: 'Error en la autenticación de Slack' }, "*");
            window.close();
          </script>
        `);
      }
      const department = await this.departmentService.getDepartmentById(metadata.department_id);
      if (!department) {
        return res.send(`
        <script>
          window.opener.postMessage({ success: false, message: 'Error en la autenticación de Slack' }, "*");
          window.close();
        </script>
      `);
      }
      const channelName = this.generateName();
      const channelId = await this.createSlackChannel(channelName, data.access_token, data.authed_user.id);
      if (!channelId) {
        return res.send(`
        <script>
          window.opener.postMessage({ success: false, message: 'Error en la autenticación de Slack' }, "*");
          window.close();
        </script>
      `);
      }
      await this.integrationService.createIntegrationSlack(department, {
        authed_user_id: data.authed_user.id,
        access_token: data.access_token,
        team_id: data.team.id,
        team_name: data.team.name,
        refresh_token: data.refresh_token,
        bot_user_id: data.bot_user_id,
        channel_id: channelId,
        channel_name: channelName,
      });
      return res.send(`
        <script>
          window.opener.postMessage({ success: true }, "*");
          window.close();
        </script>
      `);
    } catch (error) {
      console.error('Error en la autenticación de Slack:', error);
      return res.send(`
        <script>
          window.opener.postMessage({ success: false, message: 'Error en la autenticación de Slack' }, "*");
          window.close();
        </script>
      `);
    }
  }

  async createSlackChannel(channelName: string, token: string, userId: string): Promise<string | null> {
    try {
      // Crear el canal en Slack
      const response = await axios.post(
        'https://slack.com/api/conversations.create',
        {
          name: channelName,
          is_private: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;
      if (!data.ok) {
        console.error('Error al crear el canal de Slack:', data.error);
        return null;
      }

      const channelId = data.channel.id;

      // Invitar al usuario al canal
      const inviteResponse = await axios.post(
        'https://slack.com/api/conversations.invite',
        {
          channel: channelId,
          users: userId, // Usuario que generó la integración
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const inviteData = inviteResponse.data;
      if (!inviteData.ok) {
        console.error('Error al invitar al usuario al canal:', inviteData.error);
        return null;
      }

      return channelId;
    } catch (error) {
      console.error('Error en la creación del canal de Slack:', error);
      return null;
    }
  }

  generateName(maxLength: number = 20): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz-';
    let name = '';

    for (let i = 0; i < maxLength; i++) {
      name += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return name;
  }

  async renameSlackChannel(channelId: string, newName: string, token: string): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://slack.com/api/conversations.rename',
        new URLSearchParams({
          channel: channelId,
          name: newName,
        }),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (!response.data.ok) {
        throw new Error(`Error al renombrar canal: ${response.data.error}`);
      }

      return true;
    } catch (error) {
      console.error('Error al cambiar el nombre del canal:', error);
      return false;
    }
  }

  async handleMessage(text: string, channelId: string) {
    try {
      console.log('Mensaje recibido:', text);
      const integration = await this.integrationService.getIntegrationBychannelId(channelId);
      if (!integration) {
        console.log('Integración no encontrada');
        return;
      }
      let actualConversation: Conversation;

      const conversation = await this.conversationService.getConversationByIntegrationIdAndByIdentified(integration.id, channelId, IntegrationType.SLACK);
      if (!conversation) {
        actualConversation = await this.conversationService.createConversationAndChatUser(integration, channelId, ConversationType.SLACK, ChatUserType.SLACK);
      } else {
        actualConversation = conversation;
      }
      const message = await this.messageService.createMessage(actualConversation, text, MessageType.USER, integration.departamento.organizacion.id, actualConversation?.user?.id);
      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, message);
      const response = await this.integrationRouterService.processMessage(message.text, actualConversation.id, message.images);
      if (!response) return;
      const messageAi = await this.socketService.sendMessageToUser(actualConversation, response.message, message.format, undefined, integration.departamento.organizacion.id);
      if (!messageAi) return;
      this.socketService.sendMessageToChatByOrganizationId(integration.departamento.organizacion.id, actualConversation.id, messageAi);
    } catch (error) {
      console.error('Error al manejar mensaje de Slack:', error);
    }
  }

  async sendMessage(channel: string, text: string, token: string) {
    await axios.post(
      'https://slack.com/api/chat.postMessage',
      { channel, text },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async archiveChannel(channelId: string, token: string) {
    try {
      await axios.post('https://slack.com/api/conversations.archive', { channel: channelId }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.error(error.response ? error.response.data : error.message);
    }
  }
}
