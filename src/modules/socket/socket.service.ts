import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ClientMap } from './socket.type';
import { AgentService } from '@modules/agent/agentServer';
import { agentIdentifier, AgentIdentifierType, TestAgentIdentifier } from 'src/interfaces/agent';
import { Message, MessageType } from '@models/Message.entity';
import { NotificationMessage } from 'src/interfaces/notifications.interface';
import { MessageService } from '@modules/message/message.service';
import { Conversation } from '@models/Conversation.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserOrganization } from '@models/UserOrganization.entity';

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
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
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

    const userOrg = await this.userOrganizationRepository.findOne({
      loadRelationIds: true,
      where: { user: { id: userId } },
    });
    console.log('userOrg', userOrg);

    if (userOrg) {
      socket.join(`organization-${userOrg.organization}`);
    }

    // Cuando un cliente se une a un room
    socket.on('join', (room: string) => {
      // El room se crea de manera implícita si no existe
      socket.join(room);
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

  sendNotificationToOrganization<T extends { type: string; data?: unknown }>(organizationId: number, notification: NotificationMessage<T>): void {
    const room = `organization-${organizationId}`;
    this.socketServer.to(room).emit('notification', notification);
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

  async sendToChatBot(message: string, room: string, identifier: agentIdentifier, conversationId: number) {
    this.socketServer.to(room).emit('typing', message);
    if (![AgentIdentifierType.TEST, AgentIdentifierType.CHAT_TEST].includes(identifier.type)) {
      throw new Error('No se ha creado la logica para obtener el agentId para el tipo de agente');
    }
    const agentId = (identifier as TestAgentIdentifier).agentId;
    const { message: response, ...conf } = await this.agentService.getAgentResponse(message, identifier, agentId, conversationId);
    this.socketServer.to(room).emit('message', { sender: 'agent', text: response, conf });
  }

  async sendMessageToRoom(room: string, type: string, data: unknown) {
    this.socketServer.to(room).emit(type, data);
  }

  sendMessageToChat(userId: number, conversationId: number, message: Message): void {
    const userConections = this.connectedClients.getClientsByUserId(userId);
    for (const userConection of userConections) {
      userConection.socket?.emit('message', {
        action: 'new-message',
        conversation_id: conversationId,
        data: message,
      });
    }
  }

  // Método para registrar un cliente de WebChat
  registerWebChatClient(chatUserId: number, socket: WebSocket) {
    this.webChatClients.set(chatUserId, socket);
  }

  // Método para eliminar un cliente de WebChat
  removeWebChatClient(chatUserId: number) {
    this.webChatClients.delete(chatUserId);
  }

  async sendMessageToUser(conversation: Conversation, agentMessage: string, type: MessageType = MessageType.AGENT) {
    const message = await this.messageService.createMessage(conversation, agentMessage, type);
    // Enviamos al servidor de WebChat si existe el cliente
    console.log('conversation on sendmessagetouser', conversation);
    if (conversation.chat_user?.id && this.webChatClients.has(conversation.chat_user.id)) {
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

    if (!conversation.user?.id) return;
    this.sendMessageToChat(conversation.user?.id, conversation.id, message);
  }
}
