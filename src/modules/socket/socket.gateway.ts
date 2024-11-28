import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketService } from './socket.service';
import { AuthService } from '@modules/auth/auth.service';

@WebSocketGateway({
  path: '/api/events/socket.io',
  namespace: '/api/socket',
  cors: true,
})
export class SocketGateway {
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly socketService: SocketService,
    private readonly authService: AuthService,
  ) {}

  // Inicializar el servidor
  afterInit() {
    this.logger.debug('WebSocket Gateway initialized');
    this.socketService.setServer(this.server);
  }

  // Manejar la conexión de un cliente
  async handleConnection(@ConnectedSocket() client: Socket) {
    const accessToken = client.handshake.query?.token as string;
    const accessTokenData = await this.authService.validateAccessTokenSocket(accessToken);

    if (!accessTokenData) {
      client.disconnect(true);
      return;
    }

    const socketId = client.id;
    const userId = accessTokenData.userId;
    this.socketService.handleConnection(socketId, client, userId);
  }

  // Manejar la desconexión de un cliente
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const socketId = client.id;
    this.socketService.handleDisconnect(socketId);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data:{room:string, text:string}, @ConnectedSocket() client: Socket): void {
    const { room, text } = data;
    console.log(JSON.stringify(data));
    if (!client.rooms.has(room)) {
      return;
    }
    if (room.startsWith('test-chat-')) {
      this.socketService.sendToBot(text, room, parseInt(room.replace('test-chat-', '')));
    }
  }
}
