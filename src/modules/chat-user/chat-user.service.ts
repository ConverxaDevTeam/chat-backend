import { Repository } from 'typeorm';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUser, ChatUserType } from '@models/ChatUser.entity';
import { WebhookFacebookDto } from '@modules/facebook/dto/webhook-facebook.dto';
import { ChatUserDataService } from '@modules/chat-user-data/chat-user-data.service';
import { User } from '@models/User.entity';
import { OrganizationRoleType, UserOrganization } from '@models/UserOrganization.entity';
import { MessageType } from '@models/Message.entity';
import {
  ChatUsersOrganizationDto,
  ChatUsersOrganizationResponse,
  PaginationMeta,
  INTEGRATION_TO_CONVERSATION_TYPE_MAP,
  ConversationStatus,
} from './dto/chat-users-organization.dto';

@Injectable()
export class ChatUserService {
  private readonly logger = new Logger(ChatUserService.name);

  constructor(
    @InjectRepository(ChatUser)
    private readonly chatUserRepository: Repository<ChatUser>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly chatUserDataService: ChatUserDataService,
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

  async updateUserInfo(chatUserId: number, field: string, value: string): Promise<ChatUser> {
    const chatUser = await this.chatUserRepository.findOne({ where: { id: chatUserId } });
    if (!chatUser) {
      throw new BadRequestException(`ChatUser con ID ${chatUserId} no encontrado`);
    }

    // Campos estándar que se pueden actualizar directamente
    const standardFields = ['name', 'email', 'phone', 'address', 'avatar'];

    if (standardFields.includes(field)) {
      // Validaciones específicas
      if (field === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new BadRequestException('El formato del email no es válido');
        }
      }

      if (field === 'phone' && value) {
        // Normalizar teléfono (remover caracteres no numéricos excepto +)
        value = value.replace(/[^\d+]/g, '');
      }

      chatUser[field] = value.trim();
      return await this.chatUserRepository.save(chatUser);
    } else {
      throw new BadRequestException(`El campo '${field}' no es un campo estándar válido`);
    }
  }

  async saveCustomUserData(chatUserId: number, key: string, value: string): Promise<void> {
    await this.chatUserDataService.createOrUpdate(chatUserId, key, value);
  }

  async getUserCompleteInfo(chatUserId: number): Promise<{
    standardInfo: Partial<ChatUser>;
    customData: Record<string, string>;
  }> {
    const chatUser = await this.chatUserRepository.findOne({
      where: { id: chatUserId },
      select: ['id', 'name', 'email', 'phone', 'address', 'avatar'],
    });

    if (!chatUser) {
      throw new BadRequestException(`ChatUser con ID ${chatUserId} no encontrado`);
    }

    const customDataArray = await this.chatUserDataService.findAllByUser(chatUserId);
    const customData = customDataArray.reduce(
      (acc, item) => {
        acc[item.key] = item.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      standardInfo: chatUser,
      customData,
    };
  }

  async getAllUsersWithInfo(
    page: number = 1,
    limit: number = 10,
    organizationId?: number,
    search?: string,
    type?: ChatUserType,
  ): Promise<{
    users: Array<{
      standardInfo: Partial<ChatUser>;
      customData: Record<string, string>;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    let queryBuilder = this.chatUserRepository
      .createQueryBuilder('chatUser')
      .select([
        'chatUser.id',
        'chatUser.name',
        'chatUser.email',
        'chatUser.phone',
        'chatUser.address',
        'chatUser.avatar',
        'chatUser.type',
        'chatUser.created_at',
        'chatUser.last_login',
      ]);

    // Filtro por organización
    if (organizationId) {
      queryBuilder = queryBuilder
        .leftJoin('chatUser.conversations', 'conversation')
        .leftJoin('conversation.departamento', 'departamento')
        .leftJoin('departamento.organizacion', 'organizacion')
        .where('organizacion.id = :organizationId', { organizationId });
    }

    // Buscador por name, email, phone
    if (search) {
      if (organizationId) {
        queryBuilder = queryBuilder.andWhere('(chatUser.name ILIKE :search OR chatUser.email ILIKE :search OR chatUser.phone ILIKE :search)', {
          search: `%${search}%`,
        });
      } else {
        queryBuilder = queryBuilder.where('(chatUser.name ILIKE :search OR chatUser.email ILIKE :search OR chatUser.phone ILIKE :search)', {
          search: `%${search}%`,
        });
      }
    }

    // Filtro por type
    if (type) {
      if (organizationId || search) {
        queryBuilder = queryBuilder.andWhere('chatUser.type = :type', { type });
      } else {
        queryBuilder = queryBuilder.where('chatUser.type = :type', { type });
      }
    }

    // Ordenado por created_at DESC (más reciente primero)
    queryBuilder = queryBuilder.orderBy('chatUser.created_at', 'DESC').skip(skip).take(limit);

    const [chatUsers, total] = await queryBuilder.getManyAndCount();

    const usersWithInfo = await Promise.all(
      chatUsers.map(async (chatUser) => {
        const customDataArray = await this.chatUserDataService.findAllByUser(chatUser.id);
        const customData = customDataArray.reduce(
          (acc, item) => {
            acc[item.key] = item.value;
            return acc;
          },
          {} as Record<string, string>,
        );

        return {
          standardInfo: chatUser,
          customData,
        };
      }),
    );

    return {
      users: usersWithInfo,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findChatUsersByOrganizationWithLastConversation(organizationId: number, user: User, searchParams: ChatUsersOrganizationDto): Promise<ChatUsersOrganizationResponse> {
    // Verificar que el usuario pertenece a la organización
    const userOrganization = await this.userOrganizationRepository.findOne({
      where: { user: { id: user.id }, organizationId },
    });

    if (!userOrganization) {
      throw new BadRequestException('El usuario no pertenece a esta organización');
    }

    // Configuración de paginación
    const page = searchParams?.page || 1;
    const limit = searchParams?.limit || 20;
    const offset = (page - 1) * limit;

    // Query SÚPER SIMPLE - solo ChatUsers con filtros
    const queryBuilder = this.chatUserRepository
      .createQueryBuilder('cu')
      .addSelect('cu.secret')
      .innerJoin('cu.conversations', 'c')
      .innerJoin('c.departamento', 'd')
      .innerJoin('d.organizacion', 'o')
      .where('o.id = :organizationId', { organizationId });

    // Filtros de búsqueda específica
    if (searchParams?.searchType && searchParams?.searchValue) {
      this.logger.debug(`Aplicando búsqueda: tipo=${searchParams.searchType}, valor=${searchParams.searchValue}`);

      if (searchParams.searchType === 'id') {
        queryBuilder.andWhere('cu.id::text ILIKE :searchValue', {
          searchValue: `%${searchParams.searchValue}%`,
        });
      } else if (searchParams.searchType === 'name') {
        queryBuilder.andWhere('cu.name IS NOT NULL AND cu.name ILIKE :searchValue', {
          searchValue: `%${searchParams.searchValue}%`,
        });
      }
    }

    // Aplicar filtros adicionales de conversación si existen
    if (
      searchParams?.integrationType ||
      searchParams?.status ||
      searchParams?.needHuman !== undefined ||
      searchParams?.assignedToMe ||
      userOrganization.role === OrganizationRoleType.HITL
    ) {
      if (searchParams?.integrationType) {
        const conversationType = INTEGRATION_TO_CONVERSATION_TYPE_MAP[searchParams.integrationType];
        if (conversationType) {
          queryBuilder.andWhere('c.type = :conversationType', { conversationType });
        }
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

      if (searchParams?.needHuman !== undefined) {
        queryBuilder.andWhere('c.need_human = :needHuman', { needHuman: searchParams.needHuman });
      }

      if (searchParams?.assignedToMe || userOrganization.role === OrganizationRoleType.HITL) {
        queryBuilder.andWhere('c."userId" = :userId', { userId: user.id });
      }
    }

    // Contar total de chat users únicos
    const totalItems = await queryBuilder
      .select('COUNT(DISTINCT cu.id)', 'count')
      .getRawOne()
      .then((result) => parseInt(result.count));

    this.logger.debug(`Total de chat users encontrados: ${totalItems}`);

    // Obtener chat users únicos con paginación
    const chatUsers = await queryBuilder
      .select(['cu.id', 'cu.name', 'cu.email', 'cu.phone', 'cu.avatar', 'cu.secret', 'cu.identified'])
      .distinct(true)
      .limit(limit)
      .offset(offset)
      .getMany();

    this.logger.debug(`Chat users obtenidos: ${chatUsers.length} de ${totalItems} total`);

    // Obtener conversaciones más recientes para cada chat user
    const chatUserIds = chatUsers.map((cu) => cu.id);
    const conversationsQuery = this.chatUserRepository
      .createQueryBuilder('cu')
      .innerJoin('cu.conversations', 'c')
      .innerJoin('c.departamento', 'd')
      .leftJoin('c.messages', 'm')
      .select([
        'cu.id as chat_user_id',
        'c.id as conversation_id',
        'c.created_at as last_activity',
        'c.need_human as need_human',
        'c.type as integration_type',
        'c."userId" as assigned_user_id',
        'd.name as department',
        'ROW_NUMBER() OVER (PARTITION BY cu.id ORDER BY c.created_at DESC) as rn',
      ])
      .addSelect((subQuery) => {
        return subQuery.select('msg.text').from('Messages', 'msg').where('msg."conversationId" = c.id').orderBy('msg.created_at', 'DESC').limit(1);
      }, 'last_message_text')
      .addSelect((subQuery) => {
        return subQuery.select('msg.created_at').from('Messages', 'msg').where('msg."conversationId" = c.id').orderBy('msg.created_at', 'DESC').limit(1);
      }, 'last_message_created_at')
      .addSelect((subQuery) => {
        return subQuery.select('msg.type').from('Messages', 'msg').where('msg."conversationId" = c.id').orderBy('msg.created_at', 'DESC').limit(1);
      }, 'last_message_type')
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(*)')
          .from('Messages', 'unread')
          .where('unread."conversationId" = c.id')
          .andWhere('unread.type = :userType', { userType: MessageType.USER })
          .andWhere(
            `unread.created_at > COALESCE((
            SELECT MAX(staff.created_at)
            FROM "Messages" staff
            WHERE staff."conversationId" = c.id
            AND staff.type = ANY(:staffTypes)
          ), '1970-01-01')`,
            { staffTypes: [MessageType.HITL, MessageType.AGENT] },
          );
      }, 'unread_messages')
      .where('cu.id = ANY(:chatUserIds)', { chatUserIds })
      .andWhere('c.user_deleted = false')
      .getRawMany();

    const conversationsData = await conversationsQuery.then((results) => results.filter((row) => row.rn === 1));

    // Crear mapa de conversaciones por chat user
    const conversationsMap = new Map();
    conversationsData.forEach((conv) => {
      conversationsMap.set(conv.chat_user_id, conv);
    });

    // Formatear resultados con datos reales
    const formattedChatUsers = chatUsers.map((cu) => {
      const conversation = conversationsMap.get(cu.id);

      return {
        chat_user_id: cu.id.toString(),
        user_name: cu.name || '',
        user_email: cu.email || '',
        user_phone: cu.phone || '',
        avatar: cu.avatar,
        secret: cu.secret || '',
        identifier: cu.identified || '',
        last_conversation: conversation
          ? {
              conversation_id: conversation.conversation_id,
              last_message_text: conversation.last_message_text || '',
              last_message_created_at: conversation.last_message_created_at || conversation.last_activity,
              last_message_type: conversation.last_message_type || MessageType.USER,
              unread_messages: parseInt(conversation.unread_messages) || 0,
              need_human: conversation.need_human || false,
              assigned_user_id: conversation.assigned_user_id,
              integration_type: conversation.integration_type || '',
              department: conversation.department || '',
              last_activity: conversation.last_activity,
              status:
                conversation.need_human === false
                  ? ConversationStatus.IA
                  : conversation.need_human === true && !conversation.assigned_user_id
                    ? ConversationStatus.PENDIENTE
                    : ConversationStatus.ASIGNADO,
            }
          : {
              conversation_id: 0,
              last_message_text: '',
              last_message_created_at: new Date().toISOString(),
              last_message_type: MessageType.USER,
              unread_messages: 0,
              need_human: false,
              assigned_user_id: null,
              integration_type: '',
              department: '',
              last_activity: new Date().toISOString(),
              status: ConversationStatus.IA,
            },
      };
    });

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
      ...(searchParams?.searchType && { searchType: searchParams.searchType }),
      ...(searchParams?.searchValue && { searchValue: searchParams.searchValue }),
      ...(searchParams?.integrationType && { integrationType: searchParams.integrationType }),
      ...(searchParams?.status && { status: searchParams.status }),
      ...(searchParams?.needHuman !== undefined && { needHuman: searchParams.needHuman }),
      ...(searchParams?.assignedToMe && { assignedToMe: searchParams.assignedToMe }),
    };

    return {
      ok: true,
      chat_users: formattedChatUsers,
      pagination,
      appliedFilters,
    };
  }
}
