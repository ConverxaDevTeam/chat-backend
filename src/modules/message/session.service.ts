import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '@models/ChatSession.entity';
import { Message } from '@models/Message.entity';

const SESSION_TIMEOUT_MINUTES = process.env.SESSION_TIMEOUT_MINUTES ? parseInt(process.env.SESSION_TIMEOUT_MINUTES) : 12 * 60;

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async attachMessageToSession(message: Message, conversationId: number): Promise<Message> {
    const session = await this.getOrCreateSession(conversationId);
    message.chatSession = session;
    return this.messageRepository.save(message);
  }

  private async getOrCreateSession(conversationId: number): Promise<ChatSession> {
    const lastSession = await this.chatSessionRepository.findOne({
      where: { conversationId, status: ChatSessionStatus.ACTIVE },
      order: { lastInteractionAt: 'DESC' },
    });
    console.log('lastSession', lastSession);

    if (lastSession) {
      const timeDiff = Math.abs(new Date().getTime() - lastSession.lastInteractionAt.getTime()) / 1000 / 60;
      if (timeDiff <= SESSION_TIMEOUT_MINUTES) {
        lastSession.lastInteractionAt = new Date();
        return this.chatSessionRepository.save(lastSession);
      }
      console.log('closing session', lastSession);
      // Close old session if timeout exceeded
      lastSession.status = ChatSessionStatus.CLOSED;
      lastSession.closedAt = new Date();
      await this.chatSessionRepository.save(lastSession);
    }

    const newSession = new ChatSession();
    newSession.conversationId = conversationId;
    newSession.status = ChatSessionStatus.ACTIVE;
    return this.chatSessionRepository.save(newSession);
  }
}
