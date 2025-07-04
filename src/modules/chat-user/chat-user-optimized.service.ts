import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUser, ChatUserType } from '@models/ChatUser.entity';
import { Message } from '@models/Message.entity';

@Injectable()
export class ChatUserOptimizedService {
  private readonly logger = new Logger(ChatUserOptimizedService.name);

  constructor(
    @InjectRepository(ChatUser)
    private chatUserRepository: Repository<ChatUser>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async getAllUsersWithInfoOptimized(
    page: number = 1,
    limit: number = 10,
    organizationId?: number,
    search?: string,
    type?: ChatUserType,
    sortBy: string = 'last_activity',
    sortOrder: string = 'DESC',
    needHuman?: boolean,
    hasUnreadMessages?: boolean,
    dateFrom?: string,
    dateTo?: string,
    includeMessages?: boolean,
  ): Promise<{
    users: Array<{
      standardInfo: Partial<ChatUser>;
      customData: Record<string, string>;
      lastConversation?: {
        conversation_id: number;
        last_message_text: string;
        last_message_created_at: string;
        last_message_type: string;
        unread_messages: number;
        need_human: boolean;
        assigned_user_id: number | null;
        integration_type: string;
        department: string;
        last_activity: string;
        status: string;
        messages?: Array<{
          id: number;
          text: string;
          type: string;
          format: string;
          created_at: string;
          images?: string[];
          audio?: string;
          time?: number;
        }>;
      };
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    try {
      // PASO 1: Obtener usuarios con filtros simples
      const users = await this.getUsersWithFilters(skip, limit, search, type, sortBy, sortOrder);
      const total = await this.countUsersWithFilters(search, type);

      this.logger.debug(`Total de chat users encontrados: ${total}, página: ${page}, límite: ${limit}`);

      // PASO 2: Obtener custom data para todos los usuarios
      const customDataMap = await this.getCustomDataForUsers(users.map((u) => u.id));

      this.logger.debug(`Usuarios obtenidos: ${users.length}`);

      // PASO 3: Obtener últimas conversaciones para estos usuarios (filtradas por organización)
      const conversationsMap = await this.getLastConversationsForUsers(
        users.map((u) => u.id),
        organizationId,
      );

      this.logger.debug(`Conversaciones obtenidas: ${conversationsMap.size}`);

      // PASO 4: Obtener últimos mensajes para las conversaciones
      const conversationIds = Array.from(conversationsMap.values()).map((c) => c.id);
      const messagesMap = conversationIds.length > 0 ? await this.getLastMessagesForConversations(conversationIds) : new Map();

      this.logger.debug(`Mensajes obtenidos: ${messagesMap.size}`);

      // PASO 5: Combinar todo
      const usersWithInfo = users.map((user) => {
        const conversation = conversationsMap.get(user.id);
        const lastMessage = conversation ? messagesMap.get(conversation.id) : null;
        return {
          standardInfo: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            avatar: user.avatar,
            type: user.type,
            created_at: user.created_at,
            last_login: user.last_login,
          },
          customData: customDataMap.get(user.id) || {},
          lastConversation: conversation
            ? {
                conversation_id: conversation.id,
                last_message_text: lastMessage?.text || '',
                last_message_created_at: lastMessage?.created_at || conversation.created_at,
                last_message_type: lastMessage?.type || 'user',
                unread_messages: 0, // TODO: calcular
                need_human: conversation.need_human || false,
                assigned_user_id: conversation.assigned_user_id || null,
                integration_type: conversation.type || '',
                department: conversation.department || '',
                last_activity: conversation.created_at,
                status: conversation.need_human === false ? 'ia' : conversation.need_human === true && !conversation.assigned_user_id ? 'pendiente' : 'asignado',
              }
            : undefined,
        };
      });

      return {
        users: usersWithInfo,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error en getAllUsersWithInfoOptimized:', error);
      throw error;
    }
  }

  private async getUsersWithFilters(skip: number, limit: number, search?: string, type?: ChatUserType, sortBy?: string, sortOrder?: string): Promise<ChatUser[]> {
    try {
      // Simplificar para debug - usar find básico
      const whereConditions: any = {};

      if (type) {
        whereConditions.type = type;
      }

      const users = await this.chatUserRepository.find({
        where: whereConditions,
        skip,
        take: limit,
        order: {
          created_at: 'DESC',
        },
      });

      this.logger.debug(`Usuarios encontrados con find: ${users.length}`);
      return users;
    } catch (error) {
      this.logger.error('Error en getUsersWithFilters:', error);
      throw error;
    }
  }

  private async countUsersWithFilters(search?: string, type?: ChatUserType): Promise<number> {
    try {
      const whereConditions: any = {};

      if (type) {
        whereConditions.type = type;
      }

      const count = await this.chatUserRepository.count({
        where: whereConditions,
      });

      this.logger.debug(`Count usuarios: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('Error en countUsersWithFilters:', error);
      return 0;
    }
  }

  private async getLastConversationsForUsers(userIds: number[], organizationId?: number): Promise<Map<number, any>> {
    if (userIds.length === 0) return new Map();

    try {
      const query = this.chatUserRepository.manager
        .createQueryBuilder()
        .select('DISTINCT ON (c.chatUserId) c.chatUserId', 'chatUserId')
        .addSelect('c.id', 'id')
        .addSelect('c.created_at', 'created_at')
        .addSelect('c.need_human', 'need_human')
        .addSelect('c.type', 'type')
        .addSelect('c.userId', 'assigned_user_id')
        .addSelect('d.name', 'department')
        .from('Conversations', 'c')
        .leftJoin('c.departamento', 'd')
        .where('c.chatUserId IN (:...userIds)', { userIds })
        .andWhere('c.user_deleted = :userDeleted', { userDeleted: false })
        .andWhere('c.deleted_at IS NULL')
        .orderBy('c.chatUserId')
        .addOrderBy('c.created_at', 'DESC');

      // Filtrar por organización si se especifica
      if (organizationId) {
        query.leftJoin('d.organizacion', 'o').andWhere('o.id = :organizationId', { organizationId });
      }

      const conversations = await query.getRawMany();
      this.logger.debug(`Conversaciones raw encontradas: ${conversations.length}`);

      const conversationMap = new Map();
      conversations.forEach((conv) => {
        conversationMap.set(conv.chatUserId, {
          id: conv.id,
          created_at: conv.created_at?.toISOString() || new Date().toISOString(),
          need_human: conv.need_human,
          type: conv.type,
          assigned_user_id: conv.assigned_user_id,
          department: conv.department || '',
        });
      });

      return conversationMap;
    } catch (error) {
      this.logger.error('Error obteniendo conversaciones:', error);
      return new Map();
    }
  }

  private async getLastMessagesForConversations(conversationIds: number[]): Promise<Map<number, any>> {
    if (conversationIds.length === 0) return new Map();

    try {
      const messages = await this.messageRepository
        .createQueryBuilder('m')
        .select(['m.id', 'm.text', 'm.type', 'm.created_at', 'm.conversationId'])
        .where('m.conversationId IN (:...conversationIds)', { conversationIds })
        .andWhere('m.deleted_at IS NULL')
        .orderBy('m.conversationId')
        .addOrderBy('m.created_at', 'DESC')
        .getRawMany();

      this.logger.debug(`Mensajes raw encontrados: ${messages.length}`);

      const messageMap = new Map();
      const seenConversations = new Set();

      messages.forEach((msg) => {
        if (!seenConversations.has(msg.m_conversationId)) {
          messageMap.set(msg.m_conversationId, {
            text: msg.m_text || '',
            type: msg.m_type || 'user',
            created_at: msg.m_created_at?.toISOString() || new Date().toISOString(),
          });
          seenConversations.add(msg.m_conversationId);
        }
      });

      return messageMap;
    } catch (error) {
      this.logger.error('Error obteniendo mensajes:', error);
      return new Map();
    }
  }

  private applyOrderBy(query: any, sortBy: string, sortOrder: string): void {
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sortBy) {
      case 'name':
        query.orderBy('cu.name', order);
        break;
      case 'email':
        query.orderBy('cu.email', order);
        break;
      case 'phone':
        query.orderBy('cu.phone', order);
        break;
      case 'last_login':
        query.orderBy('cu.last_login', order);
        break;
      case 'created_at':
        query.orderBy('cu.created_at', order);
        break;
      case 'last_activity':
      default:
        query.orderBy('COALESCE(lc.created_at, cu.created_at)', order);
        break;
    }
  }

  private async getCustomDataForUsers(userIds: number[]): Promise<Map<number, Record<string, string>>> {
    if (userIds.length === 0) return new Map();

    const customDataResults = await this.chatUserRepository.manager
      .createQueryBuilder()
      .select('cud.chat_user_id', 'userId')
      .addSelect('cud.key', 'key')
      .addSelect('cud.value', 'value')
      .from('ChatUserData', 'cud')
      .where('cud.chat_user_id IN (:...userIds)', { userIds })
      .getRawMany();

    const customDataMap = new Map<number, Record<string, string>>();

    customDataResults.forEach((row) => {
      if (!customDataMap.has(row.userId)) {
        customDataMap.set(row.userId, {});
      }
      customDataMap.get(row.userId)![row.key] = row.value;
    });

    return customDataMap;
  }

  private async getMessagesInBatch(conversationIds: number[]): Promise<Map<number, any[]>> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .select(['message.id', 'message.text', 'message.type', 'message.format', 'message.created_at', 'message.images', 'message.audio', 'message.time', 'conversation.id'])
      .where('conversation.id IN (:...conversationIds)', { conversationIds })
      .andWhere('message.deleted_at IS NULL')
      .orderBy('conversation.id', 'ASC')
      .addOrderBy('message.created_at', 'ASC')
      .getMany();

    const messageMap = new Map<number, any[]>();

    messages.forEach((msg) => {
      const conversationId = msg.conversation?.id;
      if (conversationId) {
        if (!messageMap.has(conversationId)) {
          messageMap.set(conversationId, []);
        }

        messageMap.get(conversationId)?.push({
          id: msg.id,
          text: msg.text || '',
          type: msg.type,
          format: msg.format,
          created_at: msg.created_at ? msg.created_at.toISOString() : new Date().toISOString(),
          images: msg.images || [],
          audio: msg.audio || undefined,
          time: msg.time || undefined,
        });
      }
    });

    return messageMap;
  }

  private processUsersWithQueryBuilder(users: any[], customDataMap: Map<number, Record<string, string>>, messagesMap: Map<number, any[]>, includeMessages: boolean) {
    return users.map((user) => {
      const result: any = {
        standardInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          avatar: user.avatar,
          type: user.type,
          created_at: user.created_at,
          last_login: user.last_login,
        },
        customData: customDataMap.get(user.id) || {},
      };

      // Agregar información de última conversación si existe
      if (user.lastConversation) {
        const lastConv = user.lastConversation;
        result.lastConversation = {
          conversation_id: lastConv.id,
          last_message_text: lastConv.lastMessage?.text || '',
          last_message_created_at: lastConv.lastMessage?.created_at || lastConv.created_at,
          last_message_type: lastConv.lastMessage?.type || 'user',
          unread_messages: lastConv.unread_messages || 0,
          need_human: lastConv.need_human || false,
          assigned_user_id: lastConv.userId,
          integration_type: lastConv.type || '',
          department: lastConv.department || '',
          last_activity: lastConv.created_at,
          status: lastConv.need_human === false ? 'ia' : lastConv.need_human === true && !lastConv.userId ? 'pendiente' : 'asignado',
        };

        if (includeMessages && messagesMap.has(lastConv.id)) {
          result.lastConversation.messages = messagesMap.get(lastConv.id);
        }
      }

      return result;
    });
  }
}
