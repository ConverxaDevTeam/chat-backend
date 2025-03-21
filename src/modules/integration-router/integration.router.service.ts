import { Inject, Injectable, NotFoundException, UnauthorizedException, forwardRef } from '@nestjs/common';
import { AgentService } from '../agent/agentServer';
import { Conversation } from '@models/Conversation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocketService } from '../socket/socket.service';
import { MessageReceivedNotification, NotificationType } from 'src/interfaces/notifications.interface';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { User } from '@models/User.entity';
import { MessageFormatType, MessageType } from '@models/Message.entity';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { Express } from 'express';
import { EventType } from '@models/SystemEvent.entity';
import { ConversationType } from '@models/Conversation.entity';

@Injectable()
export class IntegrationRouterService {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
    private readonly configService: ConfigService,
  ) {}

  async saveImages(images: string[] | Array<Express.Multer.File>): Promise<string[]> {
    if (!images?.length) return [];

    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    const baseUrl = this.configService.get<string>('URL_FILES') || 'http://localhost:3001';

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    return Promise.all(
      images.map(async (image) => {
        const { buffer, fileName } = await this.processImageInput(image);
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, buffer);
        return `${baseUrl}/images/${fileName}`;
      }),
    );
  }

  private async processImageInput(input: string | Express.Multer.File): Promise<{ buffer: Buffer; fileName: string }> {
    if (typeof input === 'string') {
      const matches = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) throw new Error('Invalid base64 string');
      return {
        buffer: Buffer.from(matches[2], 'base64'),
        fileName: `${Date.now()}-${Math.random().toString(36).substring(7)}.png`,
      };
    }

    return {
      buffer: input.buffer,
      fileName: `${Date.now()}-${input.originalname}`,
    };
  }

  async processMessage(message: string, conversationId: number, images: string[] = []) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['user', 'departamento.agente', 'chat_user'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user?.id) {
      if (conversation.need_human) {
        this.conversationRepository.update(conversation.id, {
          need_human: false,
        });
      }

      this.socketService.sendNotificationToUser<MessageReceivedNotification>(conversation.user.id, {
        type: NotificationType.MESSAGE_RECEIVED,
        message: 'Nuevo mensaje en la conversación',
        data: {
          conversationId: conversation.id,
        },
      });
      return null;
    }

    const response = await this.agentService.processMessageWithConversation(message, conversation, images, conversation.chat_user?.id);
    if (!response) return;

    return {
      ...response,
      message: response.message,
      images: images,
    };
  }

  async sendAgentMessage(user: User, { message, conversationId, images }: SendAgentMessageDto) {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('conversation.integration', 'integration')
      .leftJoinAndSelect('conversation.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .addSelect('organizacion.id')
      .addSelect('integration.token')
      .addSelect('integration.phone_number_id')
      .addSelect('chat_user.identified')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (conversation.user?.id !== user.id) {
      throw new UnauthorizedException('No tienes permiso para enviar mensajes en esta conversación');
    }

    if (!conversation.departamento?.organizacion?.id) {
      throw new UnauthorizedException('No se encontro la organizacion de la conversacion');
    }

    const savedImages = images?.length ? await this.saveImages(images) : [];

    // Notificar al usuario del chat
    if (conversation.chat_user?.id) {
      this.socketService.sendMessageToUser(conversation, message ?? '', MessageFormatType.TEXT, MessageType.HITL, conversation.departamento.organizacion.id, savedImages);
    }
    return { message, images: savedImages };
  }

  async sendEventToUser(conversationId: number, event: EventType, conversationType?: ConversationType, chatUserId?: number) {
    if (conversationType === ConversationType.CHAT_WEB && chatUserId) {
      if (this.socketService.hasWebChatClient(chatUserId)) {
        this.socketService.sendEventToWebChatUser(chatUserId, event, conversationId);
      }
    }
  }
}
