import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from '@models/Conversation.entity';
import { ChatUser } from '@models/ChatUser.entity';
import { Departamento } from '@models/Departamento.entity';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async createConversation(chatUser: ChatUser, departamento: Departamento): Promise<Conversation> {
    const conversation = new Conversation();
    conversation.messages = [];
    conversation.chat_user = chatUser;
    conversation.departamento = departamento;
    await this.conversationRepository.save(conversation);
    return conversation;
  }

  async findById(id: number): Promise<Conversation | null> {
    return await this.conversationRepository.findOne({
      where: { id },
      relations: ['messages'],
    });
  }
}
