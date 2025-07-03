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

import { SearchConversationDto, PaginationMeta, ConversationListResponse } from './dto/search-conversation.dto';
import { WebhookFacebookDto } from '@modules/facebook/dto/webhook-facebook.dto';
import { NotificationStatus } from '@models/notification.entity';
import { Notification } from '@models/notification.entity';
import { OrganizationLimitService } from '@modules/organization/organization-limit.service';
import { OrganizationRoleType } from '@models/UserOrganization.entity';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    private readonly userOrganizationService: UserOrganizationService,
    private readonly chatUserService: ChatUserService,
    private readonly departmentService: DepartmentService,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly organizationLimitService: OrganizationLimitService,
  ) {}

  async createConversation(chatUser: ChatUser, departamento: Departamento): Promise<Conversation> {
    // Verificar límites e incrementar contador en una sola operación
    // Aprovechamos la organización que ya está cargada en departamento
    const organizationId = departamento.organizacion.id;
    const limitInfo = await this.organizationLimitService.checkLimitAndIncrementIfAllowed(
      organizationId,
      departamento.organizacion, // Pasamos la organización ya cargada para evitar otra consulta
    );

    // Si se ha alcanzado el límite, lanzar error
    if (limitInfo.hasReachedLimit) {
      throw new BadRequestException(`La organización ha alcanzado su límite de ${limitInfo.limit} conversaciones`);
    }

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
      order: { messages: { created_at: 'ASC' } },
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
    // Marcar notificación como leída
    await this.notificationRepository
      .createQueryBuilder()
      .update()
      .set({ status: NotificationStatus.READ })
      .where('metadata IS NOT NULL AND CAST(metadata->:key AS TEXT) = :value', {
        key: 'conversationId',
        value: conversationId.toString(),
      })
      .execute();

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

  async findByOrganizationIdAndUserId(organizationId: number, user: User, searchParams?: SearchConversationDto): Promise<ConversationListResponse> {
    // Debug log para detectar llamadas incorrectas
    this.logger.log(`Fetching conversations for organizationId: ${organizationId}, userId: ${user.id}, filters: ${JSON.stringify(searchParams)}`);

    const userOrganization = await this.userOrganizationService.getUserOrganization(user, organizationId);

    if (!userOrganization) {
      throw new BadRequestException('El usuario no pertenece a esta organización');
    }

    // Configuración de paginación
    const page = searchParams?.page || 1;
    const limit = searchParams?.limit || 20;
    const offset = (page - 1) * limit;

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
        'cu.name as user_name',
        'cu.email as user_email',
        'cu.phone as user_phone',
        'lm.id as message_id',
        'lm.created_at as message_created_at',
        'lm.text as message_text',
        'lm.type as message_type',
        'COALESCE(uc.unread_count, 0) as unread_messages',
        'd.name as department',
        'c.type as integration_type',
        `CASE
          WHEN c.need_human = false THEN 'ia'
          WHEN c.need_human = true AND c."userId" IS NULL THEN 'pendiente'
          WHEN c.need_human = true AND c."userId" IS NOT NULL THEN 'asignado'
          ELSE 'ia'
        END as status`,
      ])
      .leftJoin(
        (qb) =>
          qb
            .select('DISTINCT ON (m."conversationId") m.id as id, m."conversationId" as "conversationId", m.created_at as created_at, m.text as text, m.type as type')
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
                  .where('staff.type::text = ANY(:staffTypes)', { staffTypes: ['hitl', 'agent'] })
                  .groupBy('"conversationId"'),
              'lh',
              'lh."conversationId" = m."conversationId"',
            )
            .where('m.type::text = :userType', { userType: 'user' })
            .andWhere('(lh.last_staff_date IS NULL OR m.created_at > lh.last_staff_date)')
            .groupBy('m."conversationId", lh.last_staff_date'),
        'uc',
        'uc."conversationId" = c.id',
      )
      .innerJoin('departamento', 'd', 'd.id = c."departamentoId"')
      .innerJoin('Organizations', 'o', 'o.id = d.organization_id')
      .innerJoin('ChatUsers', 'cu', 'cu.id = c."chatUserId"')
      .where('o.id = :organizationId', { organizationId });

    // Restricción específica para usuarios HITL: solo ven conversaciones asignadas a ellos
    if (userOrganization.role === OrganizationRoleType.HITL) {
      queryBuilder.andWhere('c."userId" = :userId', { userId: user.id });
    }

    // Filtros existentes (mantener compatibilidad)
    if (searchParams?.conversationId) {
      queryBuilder.andWhere('c.id = :conversationId', { conversationId: searchParams.conversationId });
    }

    if (searchParams?.secret) {
      queryBuilder.andWhere('cu.secret = :secret', { secret: searchParams.secret });
    }

    if (searchParams?.type) {
      queryBuilder.andWhere('c.type = :type', { type: searchParams.type });
    }

    // Nuevos filtros
    if (searchParams?.search) {
      queryBuilder.andWhere('(LOWER(cu.name) LIKE LOWER(:search) OR LOWER(cu.email) LIKE LOWER(:search) OR cu.phone LIKE :search)', { search: `%${searchParams.search}%` });
    }

    if (searchParams?.department) {
      queryBuilder.andWhere('LOWER(d.name) LIKE LOWER(:department)', { department: `%${searchParams.department}%` });
    }

    if (searchParams?.integrationType) {
      // Mapear tipos de integración a tipos de conversación
      const conversationTypeMap = {
        chat_web: 'chat_web',
        whatsapp: 'whatsapp',
        whatsapp_manual: 'whatsapp',
        messenger: 'messenger',
        messenger_manual: 'messenger',
        slack: 'slack',
      };

      const conversationType = conversationTypeMap[searchParams.integrationType];
      if (conversationType) {
        queryBuilder.andWhere('c.type = :conversationType', { conversationType });
      }
    }

    if (searchParams?.needHuman !== undefined) {
      queryBuilder.andWhere('c.need_human = :needHuman', { needHuman: searchParams.needHuman });
    }

    if (searchParams?.assignedToUser !== undefined) {
      if (searchParams.assignedToUser) {
        queryBuilder.andWhere('c."userId" IS NOT NULL');
      } else {
        queryBuilder.andWhere('c."userId" IS NULL');
      }
    }

    if (searchParams?.assignedUserId) {
      queryBuilder.andWhere('c."userId" = :assignedUserId', { assignedUserId: searchParams.assignedUserId });
    }

    if (searchParams?.status) {
      switch (searchParams.status) {
        case 'ia':
          queryBuilder.andWhere('c.need_human = false');
          break;
        case 'pendiente':
          queryBuilder.andWhere('c.need_human = true AND c."userId" IS NULL');
          break;
        case 'asignado':
          queryBuilder.andWhere('c.need_human = true AND c."userId" IS NOT NULL');
          break;
      }
    }

    if (searchParams?.dateFrom) {
      queryBuilder.andWhere('c.created_at >= :dateFrom', { dateFrom: searchParams.dateFrom });
    }

    if (searchParams?.dateTo) {
      queryBuilder.andWhere('c.created_at <= :dateTo', { dateTo: searchParams.dateTo });
    }

    // Ordenamiento
    const sortBy = searchParams?.sortBy || 'created_at';
    const sortOrder = searchParams?.sortOrder || 'DESC';

    if (sortBy === 'department') {
      queryBuilder.orderBy('d.name', sortOrder);
    } else {
      queryBuilder.orderBy(`c.${sortBy}`, sortOrder);
    }

    // Contar total de elementos
    const totalItems = await queryBuilder.getCount();

    // Aplicar paginación
    const conversations = await queryBuilder.limit(limit).offset(offset).getRawMany();

    // Debug log para verificar resultados
    this.logger.log(`Found ${conversations.length} conversations for organizationId: ${organizationId}, total: ${totalItems}`);
    if (conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id).join(', ');
      this.logger.log(`Conversation IDs returned: [${conversationIds}]`);
    }

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(totalItems / limit);
    const pagination: PaginationMeta = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    // Filtros aplicados para el response
    const appliedFilters = {
      ...(searchParams?.search && { search: searchParams.search }),
      ...(searchParams?.department && { department: searchParams.department }),
      ...(searchParams?.integrationType && { integrationType: searchParams.integrationType }),
      ...(searchParams?.needHuman !== undefined && { needHuman: searchParams.needHuman }),
      ...(searchParams?.assignedToUser !== undefined && { assignedToUser: searchParams.assignedToUser }),
      ...(searchParams?.assignedUserId && { assignedUserId: searchParams.assignedUserId }),
      ...(searchParams?.status && { status: searchParams.status }),
      ...(searchParams?.dateFrom && { dateFrom: searchParams.dateFrom }),
      ...(searchParams?.dateTo && { dateTo: searchParams.dateTo }),
      ...(searchParams?.type && { type: searchParams.type }),
    };

    return {
      ok: true,
      conversations,
      pagination,
      appliedFilters,
    };
  }

  async getConversationByIntegrationIdAndByIdentified(integrationId: number, identified: string, type: IntegrationType): Promise<Conversation | null> {
    if (type === IntegrationType.WHATSAPP) {
      return await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.chat_user', 'chat_user')
        .leftJoinAndSelect('conversation.integration', 'integration')
        .leftJoinAndSelect('conversation.departamento', 'departamento')
        .leftJoinAndSelect('departamento.organizacion', 'organizacion')
        .leftJoinAndSelect('conversation.user', 'user')
        .addSelect('user.id')
        .addSelect('integration.token')
        .addSelect('integration.waba_id')
        .addSelect('integration.phone_number_id')
        .addSelect('integration.token')
        .where('integration.id = :integrationId', { integrationId })
        .andWhere('integration.type IN (:...types)', { types: [IntegrationType.WHATSAPP, IntegrationType.WHATSAPP_MANUAL] })
        .andWhere('chat_user.identified = :identified', { identified })
        .getOne();
    }
    return await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.chat_user', 'chat_user')
      .leftJoinAndSelect('conversation.integration', 'integration')
      .leftJoinAndSelect('conversation.departamento', 'departamento')
      .leftJoinAndSelect('departamento.organizacion', 'organizacion')
      .leftJoinAndSelect('conversation.user', 'user')
      .addSelect('user.id')
      .addSelect('integration.token')
      .addSelect('integration.waba_id')
      .addSelect('integration.phone_number_id')
      .addSelect('integration.token')
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

    // Verificar límites e incrementar contador en una sola operación
    const organizationId = departamento.organizacion.id;
    const limitInfo = await this.organizationLimitService.checkLimitAndIncrementIfAllowed(
      organizationId,
      departamento.organizacion, // Pasamos la organización ya cargada para evitar otra consulta
    );

    // Si se ha alcanzado el límite, lanzar error
    if (limitInfo.hasReachedLimit) {
      throw new BadRequestException(`La organización ha alcanzado su límite de ${limitInfo.limit} conversaciones`);
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

    // Verificar límites e incrementar contador en una sola operación
    const organizationId = departamento.organizacion.id;
    const limitInfo = await this.organizationLimitService.checkLimitAndIncrementIfAllowed(
      organizationId,
      departamento.organizacion, // Pasamos la organización ya cargada para evitar otra consulta
    );

    // Si se ha alcanzado el límite, lanzar error
    if (limitInfo.hasReachedLimit) {
      throw new BadRequestException(`La organización ha alcanzado su límite de ${limitInfo.limit} conversaciones`);
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
    // Debug log para detectar accesos incorrectos
    this.logger.log(`Fetching conversation ${conversationId} from organizationId: ${organizationId} for userId: ${user.id}`);

    const userOrganization = await this.userOrganizationService.getUserOrganization(user, organizationId);

    if (!userOrganization) {
      throw new Error('El usuario no pertenece a esta organización');
    }

    const result = await this.conversationRepository.findOne({
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
          id: true,
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

    // Debug log del resultado
    if (result) {
      this.logger.log(`Conversation ${conversationId} found in organizationId: ${organizationId}`);

      // Verificar si es la última conversación del chatUser
      if (result.chat_user?.id) {
        const lastConversation = await this.conversationRepository
          .createQueryBuilder('c')
          .select('c.id')
          .innerJoin('c.chat_user', 'cu')
          .innerJoin('c.departamento', 'd')
          .innerJoin('d.organizacion', 'o')
          .where('cu.id = :chatUserId', { chatUserId: result.chat_user.id })
          .andWhere('o.id = :organizationId', { organizationId })
          .orderBy('c.created_at', 'DESC')
          .limit(1)
          .getOne();

        // Agregar propiedad isLastConversation al resultado
        (result as any).isLastConversation = lastConversation?.id === conversationId;
      } else {
        (result as any).isLastConversation = false;
      }
    } else {
      this.logger.warn(`Conversation ${conversationId} NOT FOUND in organizationId: ${organizationId} - may belong to different organization`);
    }

    return result;
  }

  async removeIntegrationRelationships(integrationId: number) {
    await this.conversationRepository
      .createQueryBuilder()
      .update(Conversation)
      .set({ integration: null }) // Cambiar a NULL en la BD
      .where('integrationId = :integrationId', { integrationId }) // Referenciar la clave foránea
      .execute();
  }
}
