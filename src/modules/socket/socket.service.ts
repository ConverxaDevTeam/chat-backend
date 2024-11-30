import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ClientMap } from './socket.type';  // Asumo que tienes un ClientMap que maneja las conexiones
import { AgentService } from 'src/services/agentServer';
import { agentIdentifier } from 'src/interfaces/agent';

@Injectable()
export class SocketService {
  private socketServer: Server;
  private readonly connectedClients: ClientMap = new ClientMap();
  private readonly logger = new Logger(SocketService.name);

  constructor(
    private readonly agentService: AgentService
  ) {}

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

  async sendToBot(message: string, room: string, identifier: agentIdentifier) {
    this.socketServer.to(room).emit('typing', message);
    const {message: response, ...conf} = await this.agentService.getAgentResponse(message, identifier);
    this.socketServer.to(room).emit('message', { sender: 'agent', text: response, conf });
  }

  sendToRoom(message: string, room: string) {
    if (this.socketServer) {
      this.socketServer.to(room).emit(message);
    }
  }
}
