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
      let users: ChatUser[];
      let total: number;

      if (organizationId) {
        // Si hay filtro de organización, obtener solo usuarios que tengan conversaciones en esa organización
        const usersWithConversations = await this.getUsersWithConversationsInOrganization(
          organizationId,
          skip,
          limit,
          search,
          type,
          sortBy,
          sortOrder,
          needHuman,
          hasUnreadMessages,
          dateFrom,
          dateTo,
        );
        users = usersWithConversations.users;
        total = usersWithConversations.total;
      } else {
        // Sin filtro de organización, obtener usuarios normalmente
        users = await this.getUsersWithFilters(skip, limit, search, type, sortBy, sortOrder);
        total = await this.countUsersWithFilters(search, type);
      }

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

  private async getUsersWithConversationsInOrganization(
    organizationId: number,
    skip: number,
    limit: number,
    search?: string,
    type?: ChatUserType,
    sortBy?: string,
    sortOrder?: string,
    needHuman?: boolean,
    hasUnreadMessages?: boolean,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ users: ChatUser[]; total: number }> {
    try {
      // Primero obtener la conversación más reciente de cada usuario en la organización
      const latestConversationsQuery = `
        WITH latest_conversations AS (
          SELECT DISTINCT ON (c."chatUserId")
            c."chatUserId",
            c.id as conv_id,
            c.created_at as conv_created_at,
            c.updated_at as conv_updated_at,
            c.need_human as conv_need_human,
            c.type as conv_type,
            c."userId" as conv_user_id,
            d.name as conv_department
          FROM "Conversations" c
          INNER JOIN "departamento" d ON d.id = c."departamentoId"
          INNER JOIN "Organizations" org ON org.id = d.organization_id
          WHERE c.user_deleted = false
            AND c.deleted_at IS NULL
            AND org.id = $1
          ORDER BY c."chatUserId", c.updated_at DESC, c.created_at DESC
        )
        SELECT
          cu.id, cu.name, cu.email, cu.phone, cu.address, cu.avatar, cu.type, cu.created_at, cu.last_login,
          lc.conv_id, lc.conv_created_at, lc.conv_updated_at, lc.conv_need_human, lc.conv_type, lc.conv_user_id, lc.conv_department,
          COUNT(*) OVER() as total_count
        FROM "ChatUsers" cu
        INNER JOIN latest_conversations lc ON lc."chatUserId" = cu.id
        WHERE 1=1
      `;

      const queryParams: any[] = [organizationId];
      let paramIndex = 2;
      let filterConditions: string[] = [];

      // Aplicar filtros de usuario
      if (search) {
        filterConditions.push(`(cu.name ILIKE $${paramIndex} OR cu.email ILIKE $${paramIndex} OR cu.phone ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (type) {
        filterConditions.push(`cu.type = $${paramIndex}`);
        queryParams.push(type);
        paramIndex++;
      }

      // Aplicar filtros de conversación (sobre la más reciente)
      if (needHuman !== undefined) {
        filterConditions.push(`lc.conv_need_human = $${paramIndex}`);
        queryParams.push(needHuman);
        paramIndex++;
      }

      if (dateFrom) {
        filterConditions.push(`lc.conv_created_at >= $${paramIndex}`);
        queryParams.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        filterConditions.push(`lc.conv_created_at <= $${paramIndex}`);
        queryParams.push(dateTo);
        paramIndex++;
      }

      // Filtro por hasUnreadMessages (sobre la conversación más reciente)
      if (hasUnreadMessages !== undefined) {
        if (hasUnreadMessages) {
          filterConditions.push(`EXISTS (
            SELECT 1 FROM "Messages" unread_m
            WHERE unread_m."conversationId" = lc.conv_id
            AND unread_m.type = 'user'
            AND unread_m.deleted_at IS NULL
            AND unread_m.created_at > COALESCE((
              SELECT MAX(staff_m.created_at)
              FROM "Messages" staff_m
              WHERE staff_m."conversationId" = lc.conv_id
              AND staff_m.type IN ('hitl', 'agent')
              AND staff_m.deleted_at IS NULL
            ), '1970-01-01'::timestamp)
          )`);
        } else {
          filterConditions.push(`NOT EXISTS (
            SELECT 1 FROM "Messages" unread_m
            WHERE unread_m."conversationId" = lc.conv_id
            And unread_m.type = 'user'
            AND unread_m.deleted_at IS NULL
            AND unread_m.created_at > COALESCE((
              SELECT MAX(staff_m.created_at)
              FROM "Messages" staff_m
              WHERE staff_m."conversationId" = lc.conv_id
              AND staff_m.type IN ('hitl', 'agent')
              AND staff_m.deleted_at IS NULL
            ), '1970-01-01'::timestamp)
          )`);
        }
      }

      // Agregar condiciones WHERE si hay filtros
      let finalQuery = latestConversationsQuery;
      if (filterConditions.length > 0) {
        finalQuery += ` AND ${filterConditions.join(' AND ')}`;
      }

      // Ordenamiento
      const orderField = sortBy === 'name' ? 'cu.name' : sortBy === 'email' ? 'cu.email' : 'cu.created_at';
      const orderDirection = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      finalQuery += ` ORDER BY ${orderField} ${orderDirection}`;

      // Paginación
      finalQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, skip);

      this.logger.debug(`Query SQL: ${finalQuery}`);
      this.logger.debug(`Query params: ${JSON.stringify(queryParams)}`);

      const results = await this.chatUserRepository.manager.query(finalQuery, queryParams);
      this.logger.debug(`Query results: ${results.length} rows`);

      const users = results.map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        avatar: row.avatar,
        type: row.type,
        created_at: row.created_at,
        last_login: row.last_login,
      }));

      const total = results.length > 0 ? parseInt(results[0].total_count) : 0;

      this.logger.debug(`Usuarios con conversaciones en org ${organizationId}: ${users.length} de ${total}`);
      return { users, total };
    } catch (error) {
      this.logger.error('Error en getUsersWithConversationsInOrganization:', error);
      return { users: [], total: 0 };
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
      // Usar SQL directo por simplicidad - el QueryBuilder tiene problemas con DISTINCT ON
      const queryParams: any[] = [userIds];
      let sqlQuery = `
        SELECT DISTINCT ON (c."chatUserId")
          c."chatUserId" as "chatUserId",
          c.id as id,
          c.created_at as created_at,
          c.need_human as need_human,
          c.type as type,
          c."userId" as assigned_user_id,
          d.name as department
        FROM "Conversations" c
        LEFT JOIN "departamento" d ON d.id = c."departamentoId"
        WHERE c."chatUserId" = ANY($1)
          AND c.user_deleted = false
          AND c.deleted_at IS NULL
      `;

      // Filtrar por organización si se especifica
      if (organizationId) {
        sqlQuery += ` AND EXISTS (
          SELECT 1 FROM "departamento" dept
          LEFT JOIN "Organizations" org ON org.id = dept.organization_id
          WHERE dept.id = c."departamentoId" AND org.id = $2
        )`;
        queryParams.push(organizationId);
      }

      sqlQuery += ` ORDER BY c."chatUserId", c.created_at DESC`;

      const conversations = await this.chatUserRepository.manager.query(sqlQuery, queryParams);
      this.logger.debug(`Conversaciones raw encontradas: ${conversations.length} para usuarios: ${userIds.join(',')}`);

      const conversationMap = new Map();
      conversations.forEach((conv) => {
        conversationMap.set(conv.chatUserId, {
          id: conv.id,
          created_at: conv.created_at?.toISOString ? conv.created_at.toISOString() : new Date(conv.created_at).toISOString(),
          need_human: conv.need_human,
          type: conv.type,
          assigned_user_id: conv.assigned_user_id,
          department: conv.department || '',
        });
      });

      this.logger.debug(`Mapa de conversaciones creado: ${conversationMap.size}`);
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
