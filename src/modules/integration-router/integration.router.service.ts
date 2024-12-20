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

@Injectable()
export class IntegrationRouterService {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @Inject(forwardRef(() => SocketService))
    private readonly socketService: SocketService,
  ) {}

  async processMessage(message: string, conversationId: number, images: string[] = []) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['user', 'departamento.agente'],
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
      // Enviar notificación al usuario cuando HITL está activo
      this.socketService.sendNotificationToUser<MessageReceivedNotification>(conversation.user.id, {
        type: NotificationType.MESSAGE_RECEIVED,
        message: 'Nuevo mensaje en la conversación',
        data: {
          conversationId: conversation.id,
        },
      });
      return null;
    }

    return await this.agentService.processMessageWithConversation(message, conversation, images);
  }

  async sendAgentMessage(user: User, { message, conversationId }: SendAgentMessageDto) {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('conversation.integration', 'integration')
      .addSelect('integration.token')
      .addSelect('chat_user.identified')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (conversation.user?.id !== user.id) {
      throw new UnauthorizedException('No tienes permiso para enviar mensajes en esta conversación');
    }
    // Notificar al usuario del chat
    if (conversation.chat_user?.id) {
      this.socketService.sendMessageToUser(conversation, message, MessageFormatType.TEXT, MessageType.HITL);
    }
    return message;
  }
}
