import { Repository } from 'typeorm';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatUser, ChatUserType } from '@models/ChatUser.entity';
import { WebhookFacebookDto } from '@modules/facebook/dto/webhook-facebook.dto';
import { ChatUserDataService } from '@modules/chat-user-data/chat-user-data.service';

@Injectable()
export class ChatUserService {
  private readonly logger = new Logger(ChatUserService.name);

  constructor(
    @InjectRepository(ChatUser)
    private readonly chatUserRepository: Repository<ChatUser>,
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
      const searchCondition = organizationId ? 'AND' : 'WHERE';
      queryBuilder = queryBuilder[searchCondition.toLowerCase()]('(chatUser.name ILIKE :search OR chatUser.email ILIKE :search OR chatUser.phone ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Filtro por type
    if (type) {
      const typeCondition = organizationId || search ? 'AND' : 'WHERE';
      queryBuilder = queryBuilder[typeCondition.toLowerCase()]('chatUser.type = :type', { type });
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
}
