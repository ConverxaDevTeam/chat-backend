import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleInit } from '@nestjs/common';
import { SocketService } from './socket.service';
import { AuthService } from '@modules/auth/auth.service';
import { agentIdentifier } from 'src/interfaces/agent';
import { Server as ServerWs } from 'ws';
import { IntegrationService } from '@modules/integration/integration.service';

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
  handleMessage(@MessageBody() data: { room: string; text: string; identifier?: agentIdentifier }, @ConnectedSocket() client: Socket): void {
    try {
      const { room, text, identifier } = data;
      if (!client.rooms.has(room)) {
        return;
      }
      if (room.startsWith('test-chat-')) {
        if (!identifier) throw new Error('No se pudo obtener el identificador del agente');
        this.socketService.sendToChatBot(text, room, identifier);
      }
    } catch (error) {
      this.logger.error(`Error handling message: ${error}`);
      this.server.emit('error', { message: 'Error handling message' });
    }
  }
}

@WebSocketGateway()
export class WebChatSocketGateway implements OnModuleInit {
  private server: ServerWs;

  constructor(private readonly integrationService: IntegrationService) {}

  onModuleInit() {
    this.server = new ServerWs({ noServer: true, path: '/api/socket/web-chat' });

    this.server.on('connection', (socket, request) => {
      const origin = request.headers['origin'] as string;
      let init = false;
      console.log('New Connection Initiated');

      socket.on('message', async (data) => {
        const dataJson = JSON.parse(data.toString());
        if (dataJson.action === 'init') {
          const integration = await this.integrationService.getIntegrationWebChatById(dataJson.id);
          if (!integration) {
            socket.send(JSON.stringify({ action: 'error', message: 'Integration not found' }));
            socket.close();
            return;
          }
          const integrationConfig = JSON.parse(integration.config);
          if (!integrationConfig?.cors?.includes(origin)) {
            socket.send(JSON.stringify({ action: 'error', message: 'Origin not allowed' }));
            socket.close();
            return;
          }
          init = true;
        } else {
          if (!init) {
            socket.send(JSON.stringify({ action: 'error', message: 'Not initialized' }));
            socket.close();
            return;
          }
        }
      });

      socket.on('close', () => {
        console.log('Connection Closed');
      });
    });
  }

  bindServer(server: any) {
    server.on('upgrade', (request, socket, head) => {
      console.log('Upgrade Request');
      if (request.url === '/api/socket/web-chat') {
        this.server.handleUpgrade(request, socket, head, (ws) => {
          this.server.emit('connection', ws, request);
        });
      }
    });
  }
}
