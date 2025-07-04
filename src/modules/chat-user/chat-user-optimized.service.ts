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

    // Query SQL optimizado que reemplaza N+1 queries por 1 query complejo
    const query = this.buildOptimizedQuery(skip, limit, organizationId, search, type, sortBy, sortOrder, needHuman, hasUnreadMessages, dateFrom, dateTo);

    const [results, totalResult] = await Promise.all([this.chatUserRepository.query(query.mainQuery, query.params), this.chatUserRepository.query(query.countQuery, query.params)]);

    const total = parseInt(totalResult[0]?.total || '0');

    this.logger.debug(`Total de chat users encontrados: ${total}, página: ${page}, límite: ${limit}`);

    // Obtener mensajes si es necesario (1 query adicional)
    let messagesMap = new Map();
    if (includeMessages) {
      const conversationIds = results.map((r) => r.conversation_id).filter((id) => id);
      if (conversationIds.length > 0) {
        messagesMap = await this.getMessagesInBatch(conversationIds);
      }
    }

    const usersWithInfo = this.processResults(results, messagesMap, includeMessages || false);

    return {
      users: usersWithInfo,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private buildOptimizedQuery(
    skip: number,
    limit: number,
    organizationId?: number,
    search?: string,
    type?: ChatUserType,
    sortBy: string = 'last_activity',
    sortOrder: string = 'DESC',
    needHuman?: boolean,
    hasUnreadMessages?: boolean,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const params: any[] = [];
    let paramIndex = 1;

    const whereConditions: string[] = [];

    if (organizationId) {
      whereConditions.push(`o.id = $${paramIndex}`);
      params.push(organizationId);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(cu.name ILIKE $${paramIndex} OR cu.email ILIKE $${paramIndex} OR cu.phone ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`cu.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (needHuman !== undefined) {
      whereConditions.push(`latest_conv.need_human = $${paramIndex}`);
      params.push(needHuman);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`latest_conv.created_at >= $${paramIndex}`);
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`latest_conv.created_at <= $${paramIndex}`);
      params.push(dateTo);
      paramIndex++;
    }

    if (hasUnreadMessages !== undefined) {
      if (hasUnreadMessages) {
        whereConditions.push(`COALESCE(unread_count, 0) > 0`);
      } else {
        whereConditions.push(`COALESCE(unread_count, 0) = 0`);
      }
    }

    const orderByClause = this.buildOrderByClause(sortBy, sortOrder);
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query simplificado para depurar
    const mainQuery = `
      SELECT
        cu.id,
        cu.name,
        cu.email,
        cu.phone,
        cu.address,
        cu.avatar,
        cu.type,
        cu.created_at,
        cu.last_login
      FROM "ChatUsers" cu
      ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Query para contar total (simplificado)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "ChatUsers" cu
      ${whereClause}
    `;

    return { mainQuery, countQuery, params };
  }

  private buildOrderByClause(sortBy: string, sortOrder: string): string {
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sortBy) {
      case 'name':
        return `cu.name ${order}`;
      case 'email':
        return `cu.email ${order}`;
      case 'phone':
        return `cu.phone ${order}`;
      case 'last_login':
        return `cu.last_login ${order}`;
      case 'created_at':
        return `cu.created_at ${order}`;
      case 'last_activity':
      default:
        return `COALESCE(latest_conv.created_at, cu.created_at) ${order}`;
    }
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

  private processResults(results: any[], messagesMap: Map<number, any[]>, includeMessages: boolean) {
    return results.map((row) => {
      const result: any = {
        standardInfo: {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          address: row.address,
          avatar: row.avatar,
          type: row.type,
          created_at: row.created_at,
          last_login: row.last_login,
        },
        customData: {},
      };

      // Por ahora sin conversaciones para depurar

      return result;
    });
  }
}
