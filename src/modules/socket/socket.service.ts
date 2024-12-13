import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ClientMap } from './socket.type'; // Asumo que tienes un ClientMap que maneja las conexiones
import { AgentService } from 'src/services/agentServer';
import { agentIdentifier, AgentIdentifierType, TestAgentIdentifier } from 'src/interfaces/agent';
import { Message } from '@models/Message.entity';

@Injectable()
export class SocketService {
  private socketServer: Server;
  private readonly connectedClients: ClientMap = new ClientMap();
  private readonly logger = new Logger(SocketService.name);

  constructor(private readonly agentService: AgentService) {}

  // Establecer el servidor de sockets
  setServer(server: Server) {
    this.logger.debug('Setting socket server');
    this.socketServer = server;
  }

  // Manejar la conexión de un socket
  handleConnection(socketId: string, socket: Socket, userId: number): void {
    this.logger.debug(`New connection - socket ${socketId}`);
    this.connectedClients.addClient(socketId, socket, userId);

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

  async sendToChatBot(message: string, room: string, identifier: agentIdentifier) {
    this.socketServer.to(room).emit('typing', message);
    if (![AgentIdentifierType.TEST, AgentIdentifierType.CHAT_TEST].includes(identifier.type)) {
      throw new Error('No se ha creado la logica para obtener el agentId para el tipo de agente');
    }
    const agentId = (identifier as TestAgentIdentifier).agentId;
    const { message: response, ...conf } = await this.agentService.getAgentResponse(message, identifier, agentId);
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
}
