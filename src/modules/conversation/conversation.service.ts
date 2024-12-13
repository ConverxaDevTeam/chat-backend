import { Repository } from 'typeorm';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation, ConversationType } from '@models/Conversation.entity';
import { ChatUser } from '@models/ChatUser.entity';
import { Departamento } from '@models/Departamento.entity';
import { UserOrganizationService } from '@modules/organization/UserOrganization.service';
import { User } from '@models/User.entity';
import { Integration } from '@models/Integration.entity';
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

  async getConversationByIntegrationIdAndByPhoneNumber(integrationId: number, phoneNumber: string): Promise<Conversation | null> {
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('chat_user.integration', 'integration')
      .where('integration.id = :integrationId', { integrationId })
      .andWhere('chat_user.phone = :phoneNumber', { phoneNumber })
      .getOne();
  }

  async createConversationAndChatUser(integration: Integration, phoneNumber: string): Promise<Conversation> {
    const departamento = await this.departmentService.getDepartmentById(integration.departamento.id);

    if (!departamento) {
      throw new Error('Departamento no encontrado');
    }

    const chatUser = await this.chatUserService.createChatUserWhatsApp(phoneNumber);

    if (!chatUser) {
      throw new Error('ChatUser no creado');
    }

    const conversation = new Conversation();
    conversation.type = ConversationType.WHATSAPP;
    conversation.chat_user = chatUser;
    conversation.messages = [];
    conversation.departamento;
    conversation.integration = integration;
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
