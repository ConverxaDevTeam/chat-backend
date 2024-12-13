import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AgentService } from '../agent/agentServer';
import { Conversation } from '@models/Conversation.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocketService } from '../socket/socket.service';
import { MessageReceivedNotification, NotificationType } from 'src/interfaces/notifications.interface';

@Injectable()
export class IntegrationRouterService {
  constructor(
    @Inject(forwardRef(() => AgentService))
    private readonly agentService: AgentService,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly socketService: SocketService,
  ) {}

  async processMessage(message: string, conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['departamento', 'departamento.agente'],
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user?.id) {
      // Enviar notificación al usuario cuando HITL está activo
      this.socketService.sendNotificationToUser<MessageReceivedNotification>(conversation.user.id, {
        type: NotificationType.MESSAGE_RECEIVED,
        message: 'Nuevo mensaje en la conversación',
        data: {
          conversationId: conversation.id,
        },
      });
      return null; // Skip processing if HITL is active
    }

    return await this.agentService.processMessageWithConversation(message, conversation);
  }
}
