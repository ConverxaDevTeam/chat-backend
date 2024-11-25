import { OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, OnGatewayInit, WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketService } from './socket.service';
import { AuthService } from '@modules/auth/auth.service';

@WebSocketGateway({
  path: '/api/events/socket.io',
  namespace: '/api/socket',
  cors: true,
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly socketService: SocketService,
    private readonly authService: AuthService,
  ) {}

  afterInit() {
    this.logger.debug('Start Gateway');
    this.socketService.setServer(this.server);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    const accessToken = client.handshake.query?.token as string;
    const accessTokenData = await this.authService.validateAccessTokenSocket(accessToken);

    if (!accessTokenData) {
      client.disconnect(true);
      return;
    }

    const socketId = client.id;
    const userId = accessTokenData.userId;

    // this.logger.debug(`New connection - socket ${socketId}`);
    this.socketService.handleConnection(socketId, client, userId);
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const socketId = client.id;
    // this.logger.debug(`disconnect - socket ${socketId}`);
    this.socketService.handleDisconnect(socketId);
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(@MessageBody() { roomName, message }: { roomName: string; message: any }) {
    this.server.to(roomName).emit('message', message);
    // this.logger.debug(`Message sent to room ${roomName}: ${message}`);
  }

  async sendMessageToRoom(room: string, message: any): Promise<void> {
    this.server.to(room).emit('message', message);
    // this.logger.debug(`Message sent to room ${room}: ${message}`);
  }
}
