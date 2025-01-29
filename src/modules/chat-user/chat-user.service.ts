import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUser, ChatUserType } from '@models/ChatUser.entity';
import { WebhookFacebookDto } from '@modules/facebook/dto/webhook-facebook.dto';

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

  async createChatUserWeb(origin: string, operatingSystem: string): Promise<ChatUser> {
    const chatUser = new ChatUser();
    chatUser.secret = Math.random().toString(36).substring(2);
    chatUser.type = ChatUserType.CHAT_WEB;
    chatUser.web = origin;
    chatUser.last_login = new Date();
    chatUser.operating_system = operatingSystem;
    await this.chatUserRepository.save(chatUser);
    return chatUser;
  }

  async updateLastLogin(chatUser: ChatUser): Promise<ChatUser> {
    chatUser.last_login = new Date();
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

  async createChatUserFacebook(identified: string, type: ChatUserType): Promise<ChatUser> {
    const chatUser = new ChatUser();
    chatUser.identified = identified;
    chatUser.type = type;
    await this.chatUserRepository.save(chatUser);
    return chatUser;
  }

  async createChatUserWhatsApp(identified: string, webhookFacebookDto: WebhookFacebookDto): Promise<ChatUser> {
    const chatUser = new ChatUser();
    chatUser.identified = identified;
    chatUser.phone = identified;
    chatUser.type = ChatUserType.WHATSAPP;
    if (webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name) {
      chatUser.name = webhookFacebookDto.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name;
    }
    await this.chatUserRepository.save(chatUser);
    return chatUser;
  }

  async findByIdentifiedId(identified: string): Promise<ChatUser | null> {
    const chatUser = await this.chatUserRepository.findOne({ where: { identified: identified } });
    return chatUser;
  }
}
