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
import { MessageType } from '@models/Message.entity';
import { SearchConversationDto } from './dto/search-conversation.dto';
import { WebhookFacebookDto } from '@modules/facebook/dto/webhook-facebook.dto';

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

  async softDeleteConversation(id: number) {
    await this.conversationRepository.softRemove({ id });
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

  async findByOrganizationIdAndUserId(organizationId: number, user: User, searchParams?: SearchConversationDto): Promise<any[]> {
    const userOrganization = await this.userOrganizationService.getUserOrganization(user, organizationId);

    if (!userOrganization) {
      throw new BadRequestException('El usuario no pertenece a esta organización');
    }

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('c')
      .select([
        'c.id as id',
        'c.created_at as created_at',
        'c.need_human as need_human',
        'c.type as type',
        'null as avatar',
        'c."userId" as user_id',
        'cu.secret as secret',
        'lm.id as message_id',
        'lm.created_at as message_created_at',
        'lm.text as message_text',
        'lm.type as message_type',
        'COALESCE(uc.unread_count, 0) as unread_messages',
      ])
      .leftJoin(
        (qb) =>
          qb
            .select('DISTINCT ON (m."conversationId") m.id, m."conversationId", m.created_at, m.text, m.type')
            .from('Messages', 'm')
            .orderBy('m."conversationId"', 'ASC')
            .addOrderBy('m.created_at', 'DESC'),
        'lm',
        'lm."conversationId" = c.id',
      )
      .leftJoin(
        (qb) =>
          qb
            .select(
              `
            m."conversationId",
            CASE 
              WHEN lh.last_staff_date IS NULL THEN 0
              ELSE COUNT(m.id)
            END as unread_count
          `,
            )
            .from('Messages', 'm')
            .leftJoin(
              (qb) =>
                qb
                  .select('"conversationId", MAX(created_at) as last_staff_date')
                  .from('Messages', 'staff')
                  .where('staff.type = ANY(:staffTypes)', { staffTypes: [MessageType.HITL, MessageType.AGENT] })
                  .groupBy('"conversationId"'),
              'lh',
              'lh."conversationId" = m."conversationId"',
            )
            .where('m.type = :userType', { userType: MessageType.USER })
            .andWhere('(lh.last_staff_date IS NULL OR m.created_at > lh.last_staff_date)')
            .groupBy('m."conversationId", lh.last_staff_date'),
        'uc',
        'uc."conversationId" = c.id',
      )
      .innerJoin('departamento', 'd', 'd.id = c."departamentoId"')
      .innerJoin('Organizations', 'o', 'o.id = d.organization_id')
      .innerJoin('ChatUsers', 'cu', 'cu.id = c."chatUserId"')
      .where('o.id = :organizationId', { organizationId });

    if (searchParams?.conversationId) {
      queryBuilder.andWhere('c.id = :conversationId', { conversationId: searchParams.conversationId });
    }

    if (searchParams?.secret) {
      queryBuilder.andWhere('cu.secret = :secret', { secret: searchParams.secret });
    }

    if (searchParams?.type) {
      queryBuilder.andWhere('c.type = :type', { type: searchParams.type });
    }

    return queryBuilder.getRawMany();
  }

  async getConversationByIntegrationIdAndByIdentified(integrationId: number, identified: string, type: IntegrationType): Promise<Conversation | null> {
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('conversation.integration', 'integration')
      .addSelect('integration.token')
      .addSelect('integration.waba_id')
      .addSelect('integration.phone_number_id')
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

  async createConversationAndChatUserWhatsApp(integration: Integration, identified: string, webhookFacebookDto: WebhookFacebookDto): Promise<Conversation> {
    const departamento = await this.departmentService.getDepartmentById(integration.departamento.id);
    if (!departamento) {
      throw new Error('Departamento no encontrado');
    }

    const chatUser = await this.chatUserService.createChatUserWhatsApp(identified, webhookFacebookDto);

    if (!chatUser) {
      throw new Error('ChatUser no creado');
    }

    const conversation = new Conversation();
    conversation.type = ConversationType.WHATSAPP;
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
      select: {
        id: true,
        user: {
          id: true,
        },
        messages: {
          id: true,
          created_at: true,
          text: true,
          type: true,
          images: true,
          audio: true,
          time: true,
        },
        chat_user: {
          secret: true,
          phone: true,
          web: true,
          last_login: true,
          address: true,
          avatar: true,
          email: true,
          browser: true,
          operating_system: true,
          ip: true,
          name: true,
        },
        created_at: true,
      },
      relations: ['messages', 'chat_user', 'user'],
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
