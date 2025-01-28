import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, ObjectLiteral, DataSource } from 'typeorm';
import { Message } from '../../models/Message.entity';
import { Session } from '../../models/Session.entity';
import { ChatUser } from '../../models/ChatUser.entity';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { AnalyticType } from '../../interfaces/analytics.enum';
import { IntegrationType } from '@models/Integration.entity';
import { Funcion } from '@models/agent/Function.entity';
import { StatisticEntry } from '../../interfaces/statistic.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ChatUser)
    private chatUserRepository: Repository<ChatUser>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  private createBaseQuery<T extends ObjectLiteral>(repository: Repository<T>, dto: GetAnalyticsDto) {
    const baseQuery = repository.createQueryBuilder('entity').where('entity.organizationId = :organizationId', { organizationId: dto.organizationId });

    const addDateFilters = (field: string) => {
      if (dto.startDate) {
        baseQuery.andWhere(`${field} >= :startDate`, { startDate: dto.startDate });
      }
      if (dto.endDate) {
        baseQuery.andWhere(`${field} <= :endDate`, { endDate: dto.endDate });
      }
      return baseQuery;
    };

    return { baseQuery, addDateFilters };
  }

  async getAnalytics(user: any, dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const handlers = {
      [AnalyticType.TOTAL_USERS]: () => this.getTotalUsers(dto),
      [AnalyticType.NEW_USERS]: () => this.getNewUsers(dto),
      [AnalyticType.RECURRING_USERS]: () => this.getRecurringUsers(dto),
      [AnalyticType.TOTAL_MESSAGES]: () => this.getTotalMessages(dto),
      [AnalyticType.MESSAGES_BY_WHATSAPP]: () => this.getMessagesByType(dto, IntegrationType.WHATSAPP),
      [AnalyticType.MESSAGES_BY_FACEBOOK]: () => this.getMessagesByType(dto, IntegrationType.MESSENGER),
      [AnalyticType.MESSAGES_BY_WEB]: () => this.getMessagesByType(dto, IntegrationType.CHAT_WEB),
      [AnalyticType.IA_MESSAGES]: () => this.getIAMessages(dto),
      [AnalyticType.HITL_MESSAGES]: () => this.getHITLMessages(dto),
      [AnalyticType.AVG_IA_MESSAGES_PER_SESSION]: () => this.getAvgIAMessagesPerSession(dto),
      [AnalyticType.AVG_HITL_MESSAGES_PER_SESSION]: () => this.getAvgHITLMessagesPerSession(dto),
      [AnalyticType.AVG_SESSIONS_PER_USER]: () => this.getAvgSessionsPerUser(dto),
      [AnalyticType.FUNCTIONS_PER_SESSION]: () => this.getFunctionsPerSession(dto),
      [AnalyticType.SESSIONS]: () => this.getSessions(dto),
      [AnalyticType.FUNCTION_CALLS]: () => this.getFunctionCalls(dto),
    };

    const results = await Promise.all(
      dto.analyticTypes.map(async (type) => {
        const handler = handlers[type];
        if (!handler) throw new Error(`Unsupported analytic type: ${type}`);
        return handler();
      }),
    );

    return results.flat();
  }

  private async getTotalUsers(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('COUNT(DISTINCT ChatUsers.id)', 'count')
      .from(ChatUser, 'ChatUsers')
      .innerJoin('ChatUsers.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .getRawOne();

    return { type: AnalyticType.TOTAL_USERS, created_at: new Date(), value: Number(result?.count || 0) };
  }

  private async getNewUsers(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const users = await this.chatUserRepository
      .createQueryBuilder('chatusers')
      .select('chatusers.created_at', 'date')
      .innerJoin('chatusers.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'chatusers.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'chatusers.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .getRawMany();

    return users.map(({ date }) => ({
      type: AnalyticType.NEW_USERS,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getRecurringUsers(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { addDateFilters } = this.createBaseQuery(this.sessionRepository, dto);
    const result = await addDateFilters('session.createdAt')
      .from(Session, 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .select('COUNT(DISTINCT chatUser.id)', 'total')
      .groupBy('chatUser.id')
      .having('COUNT(session.id) > 1')
      .getRawOne();

    return {
      type: AnalyticType.RECURRING_USERS,
      created_at: new Date(),
      value: Number(result?.total || 0),
    };
  }

  private async getTotalMessages(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { addDateFilters } = this.createBaseQuery(this.messageRepository, dto);
    const count = await addDateFilters('message.createdAt')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organizationId = :organizationId', { organizationId: dto.organizationId })
      .getCount();

    return {
      type: AnalyticType.TOTAL_MESSAGES,
      created_at: new Date(),
      value: count,
    };
  }

  private async getMessagesByType(dto: GetAnalyticsDto, type: IntegrationType): Promise<StatisticEntry> {
    const { addDateFilters } = this.createBaseQuery(this.messageRepository, dto);
    const count = await addDateFilters('message.createdAt')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.integration', 'integration')
      .where('integration.type = :type', { type })
      .getCount();

    const analyticsType = {
      [IntegrationType.WHATSAPP]: AnalyticType.MESSAGES_BY_WHATSAPP,
      [IntegrationType.MESSENGER]: AnalyticType.MESSAGES_BY_FACEBOOK,
      [IntegrationType.CHAT_WEB]: AnalyticType.MESSAGES_BY_WEB,
    }[type];

    return {
      type: analyticsType,
      created_at: new Date(),
      value: count,
    };
  }

  private async getIAMessages(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { addDateFilters } = this.createBaseQuery(this.messageRepository, dto);
    const count = await addDateFilters('message.createdAt')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isAI = :isAI', { isAI: true })
      .getCount();

    return {
      type: AnalyticType.IA_MESSAGES,
      created_at: new Date(),
      value: count,
    };
  }

  private async getHITLMessages(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.messageRepository, dto);
    const count = await addDateFilters('message.createdAt')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isAI = :isAI', { isAI: false })
      .getCount();

    return {
      type: AnalyticType.HITL_MESSAGES,
      created_at: new Date(),
      value: count,
    };
  }

  private async getAvgIAMessagesPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.messageRepository, dto);
    const result = await addDateFilters('message.createdAt')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.session', 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv2')
      .where('conv2.organizationId = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isAI = :isAI', { isAI: true })
      .select('AVG(message_count)', 'average')
      .groupBy('session.id')
      .getRawOne();

    return {
      type: AnalyticType.AVG_IA_MESSAGES_PER_SESSION,
      created_at: new Date(),
      value: Number(result?.average || 0),
    };
  }

  private async getAvgHITLMessagesPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.messageRepository, dto);
    const result = await addDateFilters('message.createdAt')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.session', 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv2')
      .where('conv2.organizationId = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isAI = :isAI', { isAI: false })
      .select('AVG(message_count)', 'average')
      .groupBy('session.id')
      .getRawOne();

    return {
      type: AnalyticType.AVG_HITL_MESSAGES_PER_SESSION,
      created_at: new Date(),
      value: Number(result?.average || 0),
    };
  }

  private async getAvgSessionsPerUser(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.sessionRepository, dto);
    const result = await addDateFilters('session.createdAt')
      .from(Session, 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .select('AVG(session_count)', 'average')
      .groupBy('chatUser.id')
      .getRawOne();

    return {
      type: AnalyticType.AVG_SESSIONS_PER_USER,
      created_at: new Date(),
      value: Number(result?.average || 0),
    };
  }

  private async getFunctionsPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.functionRepository, dto);
    const result = await addDateFilters('function.createdAt')
      .from(Funcion, 'function')
      .innerJoin('function.session', 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .select('AVG(function_count)', 'average')
      .groupBy('session.id')
      .getRawOne();

    return {
      type: AnalyticType.FUNCTIONS_PER_SESSION,
      created_at: new Date(),
      value: Number(result?.average || 0),
    };
  }

  private async getSessions(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.sessionRepository, dto);
    const count = await addDateFilters('session.createdAt')
      .from(Session, 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .getCount();

    return {
      type: AnalyticType.SESSIONS,
      created_at: new Date(),
      value: count,
    };
  }

  private async getFunctionCalls(dto: GetAnalyticsDto): Promise<StatisticEntry> {
    const { baseQuery, addDateFilters } = this.createBaseQuery(this.functionRepository, dto);
    const count = await addDateFilters('function.createdAt')
      .from(Funcion, 'function')
      .innerJoin('function.session', 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .where('conv.organizationId = :organizationId', { organizationId: dto.organizationId })
      .getCount();

    return {
      type: AnalyticType.FUNCTION_CALLS,
      created_at: new Date(),
      value: count,
    };
  }
}
