import { Repository } from 'typeorm';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from '@models/Conversation.entity';
import { ChatUser } from '@models/ChatUser.entity';
import { Departamento } from '@models/Departamento.entity';
import { UserOrganizationService } from '@modules/organization/UserOrganization.service';
import { User } from '@models/User.entity';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly userOrganizationService: UserOrganizationService,
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

  async findByIdAndByChatUserId(id: number, chatUser: ChatUser): Promise<Conversation | null> {
    return await this.conversationRepository.findOne({
      where: { id, chat_user: { id: chatUser.id } },
      relations: ['messages'],
    });
  }

  async deleteConversation(id: number, chatUser: ChatUser): Promise<Conversation | null> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, chat_user: { id: chatUser.id } },
    });
    if (!conversation) {
      return null;
    }
    conversation.user_deleted = true;
    await this.conversationRepository.save(conversation);
    return conversation;
  }

  async assignHitl(conversationId: number, user: User): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.user?.id === user.id) {
      conversation.user = null;
      return await this.conversationRepository.save(conversation);
    }

    if (conversation.user) {
      throw new BadRequestException('Conversation is already assigned to a user');
    }

    conversation.user = user;
    return await this.conversationRepository.save(conversation);
  }

  async reassignHitl(conversationId: number, user: User): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.user = user;
    return await this.conversationRepository.save(conversation);
  }

  async findByOrganizationIdAndUserId(organizationId: number, user: User): Promise<Conversation[]> {
    const userOrganization = await this.userOrganizationService.getUserOrganization(user, organizationId);

    if (!userOrganization) {
      throw new BadRequestException('El usuario no pertenece a esta organización');
    }

    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.user', 'user')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('conversation.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .innerJoinAndSelect('conversation.messages', 'messages') // Solo conversaciones con mensajes
      .where('organizacion.id = :organizationId', { organizationId })
      .getMany();

    return conversations;
  }
}
