import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUser } from '@models/ChatUser.entity';

@Injectable()
export class ChatUserService {
  private readonly logger = new Logger(ChatUserService.name);

  constructor(
    @InjectRepository(ChatUser)
    private readonly chatUserRepository: Repository<ChatUser>,
  ) {}

  async findByIdWithSecret(id: number): Promise<string | null> {
    const chatUser = await this.chatUserRepository.createQueryBuilder('chatuser').addSelect('chatuser.secret').where('chatuser.id = :id', { id }).getOne();

    return chatUser ? chatUser.secret : null;
  }

  async createChatUser(): Promise<ChatUser> {
    const chatUser = new ChatUser();
    chatUser.secret = Math.random().toString(36).substring(2);
    await this.chatUserRepository.save(chatUser);
    return chatUser;
  }

  async findById(id: number): Promise<ChatUser | null> {
    const chatUser = await this.chatUserRepository
      .createQueryBuilder('chatUser')
      .leftJoinAndSelect('chatUser.conversations', 'conversations', 'conversations.user_deleted = :userDeleted', {
        userDeleted: false,
      })
      .leftJoinAndSelect('conversations.messages', 'messages')
      .where('chatUser.id = :id', { id })
      .getOne();

    return chatUser;
  }

  async createChatUserWhatsApp(phone: string): Promise<ChatUser> {
    const chatUser = new ChatUser();
    chatUser.phone = phone;
    await this.chatUserRepository.save(chatUser);
    return chatUser;
  }
}
