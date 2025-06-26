import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ClientMap } from './socket.type';
import { AgentService } from '@modules/agent/agentServer';
import { agentIdentifier, AgentIdentifierType, TestAgentIdentifier } from 'src/interfaces/agent';
import { Message, MessageFormatType, MessageType } from '@models/Message.entity';
import { NotificationMessage, NotificationType } from 'src/interfaces/notifications.interface';
import { MessageService } from '@modules/message/message.service';
import { Conversation, ConversationType } from '@models/Conversation.entity';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserOrganization, OrganizationRoleType } from '@models/UserOrganization.entity';
import { MessagerService } from '@modules/facebook/messager.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { WhatsAppService } from '../facebook/whatsapp.service';
import { SlackService } from '@modules/slack/slack.service';
import { EventType } from '@models/SystemEvent.entity';

@Injectable()
export class SocketService {
  private socketServer: Server;
  private webChatServer: Server;
  private readonly connectedClients: ClientMap = new ClientMap();
  private readonly webChatClients: Map<number, WebSocket> = new Map();
  private readonly logger = new Logger(SocketService.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly messageService: MessageService,
    private readonly messagerService: MessagerService,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly configService: ConfigService,
    private readonly whatsAppService: WhatsAppService,
    private readonly slackService: SlackService,
  ) {}

  // Establecer el servidor de sockets
  setServer(server: Server, isWebChat: boolean = false) {
    if (isWebChat) {
      this.webChatServer = server;
    } else {
      this.socketServer = server;
    }
  }

  // Manejar la conexión de un socket
  async handleConnection(socketId: string, socket: Socket, userId: number): Promise<void> {
    this.logger.debug(`New connection - socket ${socketId}`);
    this.connectedClients.addClient(socketId, socket, userId);

    const userOrg = await this.userOrganizationRepository.find({
      loadRelationIds: true,
      where: { user: { id: userId } },
    });
    this.logger.debug(`User ${userId} is part of ${userOrg.length} organizations`);
    for (const org of userOrg) {
      socket.join(`organization-${org.organization}`);
    }
    this.logger.debug(`User ${userId} joined ${userOrg.length} organizations`);
    // Cuando un cliente se une a un room
    socket.on('join', (room: string) => {
      // El room se crea de manera implícita si no existe
      socket.join(room);
      this.logger.debug(`User ${userId} joined room ${room}`);
    });

    // Cuando un cliente deja un room
    socket.on('leave', (room: string) => {
      socket.leave(room);
    });
  }

  // Manejar la desconexión de un socket
  handleDisconnect(socketId: string): void {
    this.connectedClients.removeClient(socketId);
  }
  // Enviar notificación a un usuario específico
  sendNotificationToUser<T extends { type: string; data?: unknown }>(userId: number, notification: NotificationMessage<T>): void {
    const userSockets = this.connectedClients.getClientsByUserId(userId);
    if (userSockets && userSockets.length > 0) {
      userSockets.forEach((socket) => {
        socket.socket.emit('notification', {
          ...notification,
          timestamp: new Date().toISOString(),
        });
      });
    }
  }

  private async saveImages(images: string[]): Promise<string[]> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    const baseUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    return Promise.all(
      images.map(async (base64Image) => {
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) throw new Error('Invalid base64 string');

        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        const filePath = path.join(uploadDir, fileName);

        await fs.promises.writeFile(filePath, buffer);
        return `${baseUrl}/images/${fileName}`;
      }),
    );
  }

  async sendToChatBot(message: string, room: string, identifier: agentIdentifier | TestAgentIdentifier, conversationId: number, images: string[] = []) {
    this.socketServer.to(room).emit('typing', { message, images });
    if (![AgentIdentifierType.TEST, AgentIdentifierType.CHAT_TEST].includes(identifier.type)) {
      this.logger.error('set to chatbot:', identifier.type);
      throw new Error('No se ha creado la logica para obtener el agentId para el tipo de agente');
    }
    const agentId = (identifier as TestAgentIdentifier).agentId;
    const imageUrls = images?.length ? await this.saveImages(images) : [];
    let userId: number | undefined;
    if (room.startsWith('test-chat-')) {
      userId = parseInt(room.split('-')[2]);
    }
    const agentResponse = await this.agentService.getAgentResponse({ message, identifier, agentId, conversationId, images: imageUrls, userId });
    if (!agentResponse) return;
    const { message: response, ...conf } = agentResponse;
    this.socketServer.to(room).emit('message', { sender: 'agent', text: response, conf });
  }

  async sendMessageToRoom(room: string, type: string, data: unknown) {
    this.socketServer.to(room).emit(type, data);
  }

  sendMessageToChat(organizationId: number, conversationId: number, message: Message): void {
    const room = `organization-${organizationId}`;
    this.socketServer.to(room).emit('new-message', {
      action: 'new-message',
      conversation_id: conversationId,
      data: message,
    });
  }

  // Método para registrar un cliente de WebChat
  registerWebChatClient(chatUserId: number, socket: WebSocket) {
    this.webChatClients.set(chatUserId, socket);
  }

  // Método para eliminar un cliente de WebChat
  removeWebChatClient(chatUserId: number) {
    this.webChatClients.delete(chatUserId);
  }

  async sendMessageToUser(
    conversation: Conversation,
    agentMessage: string,
    format: MessageFormatType,
    type: MessageType = MessageType.AGENT,
    organizationId: number,
    images?: string[],
  ) {
    const message =
      format !== MessageFormatType.AUDIO
        ? await this.messageService.createMessage(conversation, agentMessage, type, organizationId, undefined, { images, format, platform: 'HITL' })
        : await this.messageService.createMessageAudio(conversation, agentMessage, type, organizationId);
    // Enviamos al servidor de WebChat si existe el cliente
    if (conversation.type === ConversationType.CHAT_WEB && conversation.chat_user?.id && this.webChatClients.has(conversation.chat_user.id)) {
      const clientSocket = this.webChatClients.get(conversation.chat_user.id);
      if (!clientSocket) return;
      clientSocket.send(
        JSON.stringify({
          action: 'message-sent',
          conversation_id: conversation.id,
          message,
        }),
      );
    }

    if (conversation.type === ConversationType.MESSENGER) {
      if (format === MessageFormatType.AUDIO) {
        this.messagerService.sendFacebookMessageAudio(conversation.chat_user.identified, message.audio, conversation.integration?.token);
      } else {
        this.messagerService.sendFacebookMessage(conversation.chat_user.identified, message.text, conversation.integration?.token);
      }
    }

    if (conversation.type === ConversationType.WHATSAPP) {
      if (!conversation?.integration?.phone_number_id) {
        throw new Error('Phone number id is required');
      }
      await this.whatsAppService.sendMessage(conversation.chat_user.identified, message, conversation.integration.phone_number_id, conversation.integration.token);
    }

    if (conversation.type === ConversationType.SLACK && conversation.integration?.token) {
      this.slackService.sendMessage(conversation.chat_user.identified, message.text, conversation.integration.token);
    }

    if (!conversation.user?.id) return message;
    this.sendMessageToChat(organizationId, conversation.id, message);

    return message;
  }

  async countClientInRoom(room: string) {
    return await this.socketServer.in(room).allSockets();
  }

  async sendMessageToChatByOrganizationId(organizationId: number, conversationId: number, message: Message) {
    const listRonnOrganization = await this.countClientInRoom(`organization-${organizationId}`);
    for (const clientId of listRonnOrganization) {
      this.socketServer.to(clientId).emit('message', {
        action: 'new-message',
        conversation_id: conversationId,
        data: message,
      });
    }
  }

  async sendNotificationToOrganization(
    organizationId: number,
    event: {
      type: NotificationType;
      message: string;
      data: {
        conversationId: number;
        hitlType?: string;
      };
    },
  ) {
    const listRonnOrganization = await this.countClientInRoom(`organization-${organizationId}`);

    // Convertir Set a Array y obtener datos de clientes conectados
    const clientIds = Array.from(listRonnOrganization);
    const connectedClientsData = clientIds
      .map((clientId) => this.connectedClients.getClientById(clientId))
      .filter((clientData): clientData is NonNullable<typeof clientData> => clientData !== null);

    // Si no hay clientes conectados, salir temprano
    if (connectedClientsData.length === 0) {
      return;
    }

    // Obtener userIds únicos
    const userIds = [...new Set(connectedClientsData.map((clientData) => clientData.userId))];

    // Obtener todos los roles de usuarios en una sola consulta
    const userOrganizations = await this.userOrganizationRepository.find({
      where: {
        user: { id: In(userIds) },
        organizationId: organizationId,
      },
      relations: ['user'],
    });

    // Crear mapa de userId -> role para búsqueda rápida
    const userRoleMap = new Map<number, OrganizationRoleType>();
    userOrganizations.forEach((userOrg) => {
      userRoleMap.set(userOrg.user.id, userOrg.role);
    });

    // Enviar notificaciones a clientes filtrados
    for (const clientId of clientIds) {
      const clientData = this.connectedClients.getClientById(clientId);

      if (clientData) {
        const userRole = userRoleMap.get(clientData.userId);

        // Si el usuario es HITL y la notificación es escalamiento general (sin usuario específico),
        // no enviar la notificación (consistente con filtro de DB)
        if (userRole === OrganizationRoleType.HITL) {
          this.logger.verbose(`[SOCKET FILTER] No enviando notificación de escalamiento general a usuario HITL ${clientData.userId}`);
          continue;
        }
      }

      this.socketServer.to(clientId).emit('notification', event);
    }
  }

  // Verificar si existe un cliente de WebChat
  hasWebChatClient(chatUserId: number): boolean {
    return this.webChatClients.has(chatUserId);
  }

  // Enviar evento al usuario de WebChat
  sendEventToWebChatUser(chatUserId: number, event: EventType, conversationId: number): void {
    const clientSocket = this.webChatClients.get(chatUserId);
    if (!clientSocket) return;

    const eventData = {
      action: 'event',
      type: event,
      conversation_id: conversationId,
      timestamp: new Date().toISOString(),
    };

    clientSocket.send(JSON.stringify(eventData));
  }
}
