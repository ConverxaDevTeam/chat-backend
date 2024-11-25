import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ClientMap } from './socket.type';

@Injectable()
export class SocketService {
  private socketServer: Server;
  private readonly connectedClients: ClientMap = new ClientMap();
  private readonly logger = new Logger(SocketService.name);

  setServer(server: Server) {
    this.logger.debug('Setting socket server');
    this.socketServer = server;
  }

  handleConnection(socketId: string, socket: Socket, userId: number): void {
    console.log(`New connection - socket ${socketId}`);
    this.connectedClients.addClient(socketId, socket, userId);

    socket.on('join', function (room) {
      console.log(`Joining room test ${room}`);
      socket.join(room);
    });

    socket.on('leave', function (room) {
      console.log(`Leaving room test ${room}`);
      socket.leave(room);
    });
  }

  handleDisconnect(socketId: string): void {
    console.log(`Disconnect - socket ${socketId}`);
    this.connectedClients.removeClient(socketId);
  }

  getConnectedUsersCount(): number {
    const count = this.connectedClients.getConnectedUsersCount();
    return count;
  }

  async sendMessageToRoom(room: string, message: any): Promise<void> {
    if (!this.socketServer) {
      this.logger.error('Socket server not initialized');
      return;
    }
    this.socketServer.emit(room, message);
  }

  sendMessageForUserIdBalance(userId: number): void {
    const userConections = this.connectedClients.getClientsByUserId(userId);
    for (const userConection of userConections) {
      userConection.socket?.emit('message', {
        action: 'balance-update',
      });
    }
  }
}
