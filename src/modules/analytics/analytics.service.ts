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

  private async getTotalUsers(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const result = await this.dataSource
      .createQueryBuilder()
      .select('ChatUsers.id', 'user')
      .addSelect('MAX(messages.created_at)', 'date')
      .from(ChatUser, 'ChatUsers')
      .innerJoin('ChatUsers.conversations', 'conv')
      .innerJoin('conv.messages', 'messages')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'messages.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'messages.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('ChatUsers.id')
      .getRawMany();

    return result.map(({ date }) => ({
      type: AnalyticType.TOTAL_USERS,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getNewUsers(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const users = await this.chatUserRepository
      .createQueryBuilder('chatusers')
      .select('chatusers.id', 'user')
      .addSelect('chatusers.created_at', 'date')
      .innerJoin('chatusers.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'chatusers.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'chatusers.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('chatusers.id')
      .addGroupBy('chatusers.created_at')
      .getRawMany();

    return users.map(({ date }) => ({
      type: AnalyticType.NEW_USERS,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getRecurringUsers(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const users = await this.dataSource
      .createQueryBuilder()
      .select('chatUser.id', 'user')
      .addSelect('MAX(message.created_at)', 'date')
      .from(ChatUser, 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.messages', 'message')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('chatUser.id')
      .having('COUNT(DISTINCT DATE(message.created_at)) > 1')
      .getRawMany();

    return users.map(({ date }) => ({
      type: AnalyticType.RECURRING_USERS,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getTotalMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const messages = await this.dataSource
      .createQueryBuilder()
      .select('message.id', 'id')
      .addSelect('message.created_at', 'date')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('message.id')
      .addGroupBy('message.created_at')
      .getRawMany();

    return messages.map(({ date }) => ({
      type: AnalyticType.TOTAL_MESSAGES,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getMessagesByType(dto: GetAnalyticsDto, type: IntegrationType): Promise<StatisticEntry[]> {
    const response = await this.dataSource
      .createQueryBuilder()
      .select('message.id', 'id')
      .addSelect('message.created_at', 'date')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('conv.type = :type', { type })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('message.id')
      .addGroupBy('message.created_at')
      .getRawMany();

    const analyticsType = {
      [IntegrationType.WHATSAPP]: AnalyticType.MESSAGES_BY_WHATSAPP,
      [IntegrationType.MESSENGER]: AnalyticType.MESSAGES_BY_FACEBOOK,
      [IntegrationType.CHAT_WEB]: AnalyticType.MESSAGES_BY_WEB,
    }[type];

    return response.map(({ date }) => ({
      type: analyticsType,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getIAMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const messages = await this.dataSource
      .createQueryBuilder()
      .select('message.id', 'id')
      .addSelect('message.created_at', 'date')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isFromIA = :isFromIA', { isFromIA: true })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('message.id')
      .addGroupBy('message.created_at')
      .getRawMany();

    return messages.map(({ date }) => ({
      type: AnalyticType.IA_MESSAGES,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getHITLMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const messages = await this.dataSource
      .createQueryBuilder()
      .select('message.id', 'id')
      .addSelect('message.created_at', 'date')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isFromIA = :isFromIA', { isFromIA: false })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('message.id')
      .addGroupBy('message.created_at')
      .getRawMany();

    return messages.map(({ date }) => ({
      type: AnalyticType.HITL_MESSAGES,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getAvgIAMessagesPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'session_id')
      .addSelect('COUNT(message.id)', 'count')
      .addSelect('MAX(message.created_at)', 'date')
      .from(Session, 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .innerJoin('conv.messages', 'message')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isFromIA = :isFromIA', { isFromIA: true })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('session.id')
      .getRawMany();

    return sessions.map(({ date, count }) => ({
      type: AnalyticType.AVG_IA_MESSAGES_PER_SESSION,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getAvgHITLMessagesPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'session_id')
      .addSelect('COUNT(message.id)', 'count')
      .addSelect('MAX(message.created_at)', 'date')
      .from(Session, 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .innerJoin('conv.messages', 'message')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.isFromIA = :isFromIA', { isFromIA: false })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('session.id')
      .getRawMany();

    return sessions.map(({ date, count }) => ({
      type: AnalyticType.AVG_HITL_MESSAGES_PER_SESSION,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getAvgSessionsPerUser(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const users = await this.dataSource
      .createQueryBuilder()
      .select('chatUser.id', 'user_id')
      .addSelect('COUNT(session.id)', 'count')
      .addSelect('MAX(session.created_at)', 'date')
      .from(ChatUser, 'chatUser')
      .innerJoin('chatUser.sessions', 'session')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'session.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'session.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('chatUser.id')
      .getRawMany();

    return users.map(({ date, count }) => ({
      type: AnalyticType.AVG_SESSIONS_PER_USER,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getFunctionsPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'session_id')
      .addSelect('COUNT(function.id)', 'count')
      .addSelect('MAX(function.created_at)', 'date')
      .from(Session, 'session')
      .innerJoin('session.functions', 'function')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'function.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'function.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('session.id')
      .getRawMany();

    return sessions.map(({ date, count }) => ({
      type: AnalyticType.FUNCTIONS_PER_SESSION,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getSessions(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'id')
      .addSelect('session.created_at', 'date')
      .from(Session, 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'session.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'session.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('session.id')
      .addGroupBy('session.created_at')
      .getRawMany();

    return sessions.map(({ date }) => ({
      type: AnalyticType.SESSIONS,
      created_at: new Date(date),
      value: 1,
    }));
  }

  private async getFunctionCalls(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const functions = await this.dataSource
      .createQueryBuilder()
      .select('function.id', 'id')
      .addSelect('function.created_at', 'date')
      .from(Funcion, 'function')
      .innerJoin('function.session', 'session')
      .innerJoin('session.chatUser', 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'function.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'function.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('function.id')
      .addGroupBy('function.created_at')
      .getRawMany();

    return functions.map(({ date }) => ({
      type: AnalyticType.FUNCTION_CALLS,
      created_at: new Date(date),
      value: 1,
    }));
  }
}
