import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { SocketService } from './socket.service';
import { AuthService } from '@modules/auth/auth.service';
import { agentIdentifier } from 'src/interfaces/agent';
import { Server as ServerWs } from 'ws';
import { IntegrationService } from '@modules/integration/integration.service';
import { ChatUserService } from '@modules/chat-user/chat-user.service';
import { ConversationService } from '@modules/conversation/conversation.service';
import { ChatUser } from '@models/ChatUser.entity';
import { Departamento } from '@models/Departamento.entity';
import { MessageFormatType, MessageType } from '@models/Message.entity';
import { MessageService } from '@modules/message/message.service';
import { IntegrationRouterService } from '@modules/integration-router/integration.router.service';
import * as uuid from 'uuid';
import { join } from 'path';
import * as fs from 'fs';
import { IntegrationType } from '@models/Integration.entity';

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
    @Inject(forwardRef(() => SocketService))
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
  handleMessage(@MessageBody() data: { room: string; text: string; identifier?: agentIdentifier; images?: string[] }, @ConnectedSocket() client: Socket): void {
    try {
      const { room, text, identifier, images = [] } = data;
      if (!client.rooms.has(room)) {
        return;
      }
      if (room.startsWith('test-chat-')) {
        if (!identifier) throw new Error('No se pudo obtener el identificador del agente');
        this.socketService.sendToChatBot(text, room, identifier, -1, images);
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

  constructor(
    private readonly integrationService: IntegrationService,
    private readonly chatUserService: ChatUserService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly integrationRouterService: IntegrationRouterService,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
  ) {}

  onModuleInit() {
    this.server = new ServerWs({ noServer: true, path: '/api/socket/web-chat' });
    // Inicializar el servidor WebChat
    this.socketService.setServer(this.server, true);

    this.server.on('connection', (socket, request) => {
      const origin = request.headers['origin'] as string;
      console.log(`[WEBCHAT-INIT] Nueva conexión WebSocket desde origen: ${origin}`);
      let init: boolean = false;
      let chatUserActual: ChatUser;
      let departamentoActual: Departamento;

      socket.on('message', async (data) => {
        try {
          const dataJson = JSON.parse(data.toString());
          console.log(`[WEBCHAT-MESSAGE] Mensaje recibido - Action: ${dataJson.action}, Origin: ${origin}`);
          if (dataJson.action === 'init') {
            console.log(`[WEBCHAT-INIT] Iniciando proceso de inicialización con ID: ${dataJson.id}`);
            const integration = await this.integrationService.getIntegrationWebChatById(dataJson.id);
            console.log(`[WEBCHAT-INTEGRATION] Búsqueda de integración - ID: ${dataJson.id}, Encontrada: ${!!integration}`);
            if (!integration) {
              console.log(`[WEBCHAT-ERROR] Integración no encontrada para ID: ${dataJson.id}`);
              socket.send(JSON.stringify({ action: 'error', message: 'Integration not found' }));
              socket.close();
              return;
            }
            const departamento = await this.integrationService.getDepartamentoById(integration.departamento.id);
            console.log(`[WEBCHAT-DEPARTMENT] Búsqueda de departamento - ID: ${integration.departamento.id}, Encontrado: ${!!departamento}`);
            if (!departamento) {
              console.log(`[WEBCHAT-ERROR] Departamento no encontrado para ID: ${integration.departamento.id}`);
              socket.send(JSON.stringify({ action: 'error', message: 'Department not found' }));
              socket.close();
              return;
            }
            departamentoActual = departamento;
            console.log(`[WEBCHAT-DEPARTMENT] Departamento asignado - ID: ${departamento.id}, Organización: ${departamento.organizacion?.id || departamento.organizacion}`);
            const integrationConfig = JSON.parse(integration.config);
            console.log(`[WEBCHAT-CORS] Verificando CORS - Origin: ${origin}, CORS config: ${JSON.stringify(integrationConfig?.cors)}`);
            if (
              !integrationConfig?.cors?.some((corsUrl: string) => {
                try {
                  // Normalizar URLs para manejar diferentes protocolos
                  let normalizedCorsUrl = corsUrl;
                  let normalizedOrigin = origin;

                  // Agregar protocolo si no existe
                  if (!normalizedCorsUrl.includes('://')) {
                    normalizedCorsUrl = `https://${normalizedCorsUrl}`;
                  }

                  if (!normalizedOrigin.includes('://')) {
                    normalizedOrigin = `https://${normalizedOrigin}`;
                  }

                  const url = new URL(normalizedCorsUrl);
                  const originUrl = new URL(normalizedOrigin);

                  // Comparar solo los hostnames para ignorar diferencias de protocolo
                  return url.hostname === originUrl.hostname;
                } catch (error) {
                  console.error(`Error validando CORS URL: ${corsUrl} contra origen: ${origin}`, error);
                  return false;
                }
              })
            ) {
              console.log(`[WEBCHAT-ERROR] CORS no permitido - Origin: ${origin} no está en la lista de CORS permitidos`);
              socket.send(JSON.stringify({ action: 'error', message: 'CORS not allowed' }));
              socket.close();
              return;
            }
            console.log(`[WEBCHAT-CORS] CORS verificado exitosamente para origin: ${origin}`);
            init = true;
            console.log(`[WEBCHAT-USER] Verificando usuario - User: ${dataJson.user}, HasSecret: ${!!dataJson.user_secret}`);
            if (!dataJson.user || !dataJson.user_secret) {
              const chatUser = await this.chatUserService.createChatUserWeb(origin, request.headers['user-agent']);
              this.socketService.registerWebChatClient(chatUser.id, socket);
              socket.send(JSON.stringify({ action: 'set-user', user: chatUser.id, secret: chatUser.secret }));
              socket.send(JSON.stringify({ action: 'upload-conversations', conversations: [] }));
              chatUserActual = chatUser;
              return;
            }
            const secretUser = await this.chatUserService.findByIdWithSecret(Number(dataJson.user));
            console.log(`[WEBCHAT-AUTH] Verificando secreto de usuario - UserID: ${dataJson.user}, SecretValid: ${secretUser === dataJson.user_secret && secretUser !== null}`);
            if (secretUser !== dataJson.user_secret || secretUser === null) {
              const chatUser = await this.chatUserService.createChatUserWeb(origin, request.headers['user-agent']);
              this.socketService.registerWebChatClient(chatUser.id, socket);
              socket.send(JSON.stringify({ action: 'set-user', user: chatUser.id, secret: chatUser.secret }));
              socket.send(JSON.stringify({ action: 'upload-conversations', conversations: [] }));
              chatUserActual = chatUser;
              return;
            }
            const chatUser = await this.chatUserService.findById(Number(dataJson.user));
            console.log(`[WEBCHAT-USER] Buscando usuario existente - UserID: ${dataJson.user}, Encontrado: ${!!chatUser}`);
            if (chatUser) {
              console.log(`[WEBCHAT-USER] Usuario encontrado - ID: ${chatUser.id}, Conversaciones: ${chatUser.conversations?.length || 0}`);
              this.socketService.registerWebChatClient(chatUser.id, socket);
              await this.chatUserService.updateLastLogin(chatUser);
              console.log(`[WEBCHAT-CONVERSATIONS] Enviando ${chatUser.conversations?.length || 0} conversaciones para usuario: ${chatUser.id}`);
              socket.send(JSON.stringify({ action: 'upload-conversations', conversations: chatUser.conversations }));
              chatUserActual = chatUser;
            } else {
              socket.send(JSON.stringify({ action: 'error', message: 'Not initialized' }));
              socket.close();
            }
          } else {
            if (!init || !chatUserActual) {
              console.log(`[WEBCHAT-ERROR] Acción sin inicializar - Init: ${init}, User: ${!!chatUserActual}, Action: ${dataJson.action}`);
              socket.send(JSON.stringify({ action: 'error', message: 'Not initialized' }));
              socket.close();
              return;
            }
            if (dataJson.action === 'create-conversation') {
              const conversation = await this.conversationService.createConversation(chatUserActual, departamentoActual);
              socket.send(JSON.stringify({ action: 'conversation-created', conversation }));
            } else if (dataJson.action === 'delete-conversation') {
              const conversation = await this.conversationService.deleteConversation(dataJson.id, chatUserActual);
              if (conversation) {
                socket.send(JSON.stringify({ action: 'conversation-deleted', id: conversation.id }));
              }
            } else if (dataJson.action === 'update-conversation') {
              const conversation = await this.conversationService.findByIdAndByChatUserId(dataJson.id, chatUserActual);
              if (conversation) {
                socket.send(JSON.stringify({ action: 'conversation-updated', conversation }));
              }
            } else if (dataJson.action === 'send-message') {
              const conversation = await this.conversationService.findByIdAndByChatUserId(dataJson.conversation_id, chatUserActual);
              if (conversation) {
                const organizationId = Number(departamentoActual.organizacion?.id || departamentoActual.organizacion);

                const imageUrls = await this.integrationRouterService.saveImages(dataJson.message.images as string[]);
                const message = await this.messageService.createMessage(conversation, dataJson.message.text, MessageType.USER, organizationId, conversation?.user?.id, {
                  platform: IntegrationType.CHAT_WEB,
                  format: MessageFormatType.TEXT,
                  images: imageUrls,
                });
                socket.send(JSON.stringify({ action: 'message-sent', conversation_id: conversation.id, message }));

                // FIXED: Using organizationId already defined above
                this.socketService.sendMessageToChatByOrganizationId(organizationId, conversation.id, message);
                try {
                  const response = await this.integrationRouterService.processMessage(dataJson.message.text, conversation.id, imageUrls);
                  if (!response) return;
                  const messageAi = await this.socketService.sendMessageToUser(conversation, response.message, message.format, MessageType.AGENT, organizationId);
                  if (!messageAi) return;
                  this.socketService.sendMessageToChatByOrganizationId(organizationId, conversation.id, messageAi);
                } catch (error) {
                  console.log('error:', error);
                }
              }
            } else if (dataJson.action === 'send-audio') {
              const conversation = await this.conversationService.findByIdAndByChatUserId(dataJson.conversation_id, chatUserActual);
              if (conversation) {
                const audioBuffer = Buffer.from(dataJson.array_buffer, 'base64');
                const uniqueName = `${uuid.v4()}.wav`;
                const audioDir = join(__dirname, '..', '..', '..', '..', 'uploads', 'audio');

                if (!fs.existsSync(audioDir)) {
                  fs.mkdirSync(audioDir);
                }

                const filePath = join(audioDir, uniqueName);
                fs.writeFileSync(filePath, audioBuffer);
                const message = await this.messageService.createMessage(conversation, '', MessageType.USER, Number(departamentoActual.organizacion), conversation?.user?.id, {
                  platform: IntegrationType.CHAT_WEB,
                  format: MessageFormatType.AUDIO,
                  audio_url: uniqueName,
                });
                socket.send(JSON.stringify({ action: 'message-sent', conversation_id: conversation.id, message }));

                const organizationId = Number(departamentoActual.organizacion?.id || departamentoActual.organizacion);
                this.socketService.sendMessageToChatByOrganizationId(organizationId, conversation.id, message);
                try {
                  const response = await this.integrationRouterService.processMessage(message.text, conversation.id);
                  if (!response) return;
                  const messageAi = await this.socketService.sendMessageToUser(conversation, response.message, MessageFormatType.TEXT, MessageType.AGENT, organizationId);
                  if (!messageAi) return;
                  this.socketService.sendMessageToChatByOrganizationId(organizationId, conversation.id, messageAi);
                } catch (error) {
                  console.log('error:', error);
                }
              }
            }
          }
        } catch (error) {
          console.error(`[WEBCHAT-ERROR] Error procesando mensaje:`, error);
          console.error(`[WEBCHAT-ERROR] Datos del mensaje:`, data.toString());
          socket.send(JSON.stringify({ action: 'error', message: 'Error procesando mensaje' }));
        }
      });

      socket.on('close', () => {
        console.log(`[WEBCHAT-CLOSE] Conexión cerrada - Origin: ${origin}, UserID: ${chatUserActual?.id || 'N/A'}`);
        if (chatUserActual?.id) {
          this.socketService.removeWebChatClient(chatUserActual.id);
        }
      });
    });
  }

  bindServer(server: any) {
    server.on('upgrade', (request, socket, head) => {
      if (request.url === '/api/socket/web-chat') {
        this.server.handleUpgrade(request, socket, head, (ws) => {
          this.server.emit('connection', ws, request);
        });
      }
    });
  }
}
