import { Repository } from 'typeorm';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation, ConversationType } from '@models/Conversation.entity';
import { ChatUser, ChatUserType } from '@models/ChatUser.entity';
import { Departamento } from '@models/Departamento.entity';
import { UserOrganizationService } from '@modules/organization/UserOrganization.service';
import { User } from '@models/User.entity';
import { Integration, IntegrationType } from '@models/Integration.entity';
import { ChatUserService } from '@modules/chat-user/chat-user.service';
import { DepartmentService } from '@modules/department/department.service';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly userOrganizationService: UserOrganizationService,
    private readonly chatUserService: ChatUserService,
    private readonly departmentService: DepartmentService,
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
      relations: ['messages', 'user', 'chat_user'],
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
      relations: ['messages', 'user'],
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

    const conversations = await this.conversationRepository.find({
      relations: ['user', 'messages'],
      where: {
        departamento: {
          organizacion: {
            id: organizationId,
          },
        },
      },
    });

    return conversations;
  }

  async getConversationByIntegrationIdAndByIdentified(integrationId: number, identified: string, type: IntegrationType): Promise<Conversation | null> {
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('conversation.integration', 'integration')
      .where('integration.id = :integrationId', { integrationId })
      .andWhere('integration.type = :type', { type })
      .andWhere('chat_user.identified = :identified', { identified })
      .getOne();
  }

  async createConversationAndChatUser(integration: Integration, identified: string, type: ConversationType, userType: ChatUserType): Promise<Conversation> {
    const departamento = await this.departmentService.getDepartmentById(integration.departamento.id);

    if (!departamento) {
      throw new Error('Departamento no encontrado');
    }

    const chatUser = await this.chatUserService.createChatUserFacebook(identified, userType);

    if (!chatUser) {
      throw new Error('ChatUser no creado');
    }

    const conversation = new Conversation();
    conversation.type = type;
    conversation.chat_user = chatUser;
    conversation.messages = [];
    conversation.departamento = departamento;
    conversation.integration = integration;
    await this.conversationRepository.save(conversation);
    return conversation;
  }

  async getConversationByOrganizationIdAndById(organizationId: number, conversationId: number, user: User): Promise<Conversation | null> {
    const userOrganization = await this.userOrganizationService.getUserOrganization(user, organizationId);

    if (!userOrganization) {
      throw new Error('El usuario no pertenece a esta organización');
    }

    return await this.conversationRepository.findOne({
      relations: ['user', 'messages'],
      where: {
        id: conversationId,
        departamento: {
          organizacion: {
            id: organizationId,
          },
        },
      },
    });
  }
}
