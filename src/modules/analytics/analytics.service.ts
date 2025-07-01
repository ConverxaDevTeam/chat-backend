import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Message, MessageType } from '../../models/Message.entity';
import { ChatSession } from '../../models/ChatSession.entity';
import { ChatUser } from '../../models/ChatUser.entity';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { AnalyticType } from '../../interfaces/analytics.enum';
import { IntegrationType } from '@models/Integration.entity';
import { StatisticEntry } from '../../interfaces/statistic.interface';
import { SystemEvent, EventType } from '@models/SystemEvent.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ChatUser)
    private chatUserRepository: Repository<ChatUser>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async getAnalytics(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const handlers = {
      [AnalyticType.TOTAL_USERS]: () => this.getTotalUsers(dto),
      [AnalyticType.NEW_USERS]: () => this.getNewUsers(dto),
      [AnalyticType.RECURRING_USERS]: () => this.getRecurringUsers(dto),
      [AnalyticType.USERS_WITHOUT_MESSAGES]: () => this.getUsersWithoutMessages(dto),
      [AnalyticType.TOTAL_MESSAGES]: () => this.getTotalMessages(dto),
      [AnalyticType.MESSAGES_BY_WHATSAPP]: () => this.getMessagesByType(dto, IntegrationType.WHATSAPP),
      [AnalyticType.MESSAGES_BY_FACEBOOK]: () => this.getMessagesByType(dto, IntegrationType.MESSENGER),
      [AnalyticType.MESSAGES_BY_WEB]: () => this.getMessagesByType(dto, IntegrationType.CHAT_WEB),
      [AnalyticType.IA_MESSAGES]: () => this.getIAMessages(dto),
      [AnalyticType.HITL_MESSAGES]: () => this.getHITLMessages(dto),
      [AnalyticType.IA_MESSAGES_PER_SESSION]: () => this.getIAMessagesPerSession(dto),
      [AnalyticType.HITL_MESSAGES_PER_SESSION]: () => this.getHITLMessagesPerSession(dto),
      [AnalyticType.SESSIONS_PER_USER]: () => this.getSessionsPerUser(dto),
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
    // Users who had activity (messages/conversations) on each day
    const result = await this.dataSource
      .createQueryBuilder()
      .select('DATE(messages.created_at)', 'day')
      .addSelect('COUNT(DISTINCT chatusers.id)', 'count')
      .from(ChatUser, 'chatusers')
      .innerJoin('chatusers.conversations', 'conv')
      .innerJoin('conv.messages', 'messages')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'messages.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'messages.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return result.map(({ day, count }) => ({
      type: AnalyticType.TOTAL_USERS,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getNewUsers(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    // Users registered on each day AND sent messages
    const users = await this.dataSource
      .createQueryBuilder()
      .select('DATE(chatusers.created_at)', 'day')
      .addSelect('COUNT(DISTINCT chatusers.id)', 'count')
      .from(ChatUser, 'chatusers')
      .innerJoin('chatusers.conversations', 'conv')
      .innerJoin('conv.messages', 'messages')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'chatusers.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'chatusers.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .andWhere('DATE(chatusers.created_at) = DATE(messages.created_at)')
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return users.map(({ day, count }) => ({
      type: AnalyticType.NEW_USERS,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getRecurringUsers(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    // Users who had activity on a day but were NOT registered that same day
    const users = await this.dataSource
      .createQueryBuilder()
      .select('DATE(messages.created_at)', 'day')
      .addSelect('COUNT(DISTINCT chatUser.id)', 'count')
      .from(ChatUser, 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.messages', 'messages')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'messages.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'messages.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .andWhere('DATE(chatUser.created_at) != DATE(messages.created_at)')
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return users.map(({ day, count }) => ({
      type: AnalyticType.RECURRING_USERS,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getUsersWithoutMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    // Users registered each day but never sent any messages
    const users = await this.dataSource
      .createQueryBuilder()
      .select('DATE(chatusers.created_at)', 'day')
      .addSelect('COUNT(DISTINCT chatusers.id)', 'count')
      .from(ChatUser, 'chatusers')
      .innerJoin('chatusers.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .leftJoin('conv.messages', 'messages')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'chatusers.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'chatusers.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .andWhere('messages.id IS NULL')
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return users.map(({ day, count }) => ({
      type: AnalyticType.USERS_WITHOUT_MESSAGES,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getTotalMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const messages = await this.dataSource
      .createQueryBuilder()
      .select('DATE(message.created_at)', 'day')
      .addSelect('COUNT(message.id)', 'count')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return messages.map(({ day, count }) => ({
      type: AnalyticType.TOTAL_MESSAGES,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getMessagesByType(dto: GetAnalyticsDto, type: IntegrationType): Promise<StatisticEntry[]> {
    const response = await this.dataSource
      .createQueryBuilder()
      .select('DATE(message.created_at)', 'day')
      .addSelect('COUNT(message.id)', 'count')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('conv.type = :type', { type })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    const analyticsType = {
      [IntegrationType.WHATSAPP]: AnalyticType.MESSAGES_BY_WHATSAPP,
      [IntegrationType.MESSENGER]: AnalyticType.MESSAGES_BY_FACEBOOK,
      [IntegrationType.CHAT_WEB]: AnalyticType.MESSAGES_BY_WEB,
    }[type];

    return response.map(({ day, count }) => ({
      type: analyticsType,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getIAMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const messages = await this.dataSource
      .createQueryBuilder()
      .select('DATE(message.created_at)', 'day')
      .addSelect('COUNT(message.id)', 'count')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.type = :type', { type: MessageType.AGENT })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return messages.map(({ day, count }) => ({
      type: AnalyticType.IA_MESSAGES,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getHITLMessages(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const messages = await this.dataSource
      .createQueryBuilder()
      .select('DATE(message.created_at)', 'day')
      .addSelect('COUNT(message.id)', 'count')
      .from(Message, 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.type = :type', { type: MessageType.HITL })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return messages.map(({ day, count }) => ({
      type: AnalyticType.HITL_MESSAGES,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getIAMessagesPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'session_id')
      .addSelect('COUNT(message.id)', 'count')
      .addSelect('MAX(message.created_at)', 'date')
      .from(ChatSession, 'session')
      .innerJoin('session.messages', 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.type = :type', { type: MessageType.AGENT })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('session.id')
      .getRawMany();

    return sessions.map(({ date, count }) => ({
      type: AnalyticType.IA_MESSAGES_PER_SESSION,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getHITLMessagesPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'session_id')
      .addSelect('COUNT(message.id)', 'count')
      .addSelect('MAX(message.created_at)', 'date')
      .from(ChatSession, 'session')
      .innerJoin('session.messages', 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('message.type = :type', { type: MessageType.HITL })
      .andWhere(dto.startDate ? 'message.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'message.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('session.id')
      .getRawMany();

    return sessions.map(({ date, count }) => ({
      type: AnalyticType.HITL_MESSAGES_PER_SESSION,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getSessionsPerUser(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const users = await this.dataSource
      .createQueryBuilder()
      .select('chatUser.id', 'user_id')
      .addSelect('COUNT(DISTINCT session.id)', 'count')
      .addSelect('MAX(session.created_at)', 'date')
      .from(ChatUser, 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .innerJoin('conv.messages', 'messages')
      .innerJoin('messages.chatSession', 'session')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'session.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'session.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('chatUser.id')
      .getRawMany();

    return users.map(({ date, count }) => ({
      type: AnalyticType.SESSIONS_PER_USER,
      created_at: new Date(date),
      value: Number(count),
    }));
  }

  private async getFunctionsPerSession(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const sessions = await this.dataSource
      .createQueryBuilder()
      .select('session.id', 'session_id')
      .addSelect('COUNT(event.id)', 'count')
      .addSelect('MAX(event.created_at)', 'date')
      .from(ChatSession, 'session')
      .innerJoin('session.messages', 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .leftJoin(SystemEvent, 'event', 'event.conversation_id = conv.id AND event.type = :eventType', { eventType: EventType.FUNCTION_CALL })
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'event.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'event.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
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
      .select('DATE(session.created_at)', 'day')
      .addSelect('COUNT(session.id)', 'count')
      .from(ChatSession, 'session')
      .innerJoin('session.messages', 'message')
      .innerJoin('message.conversation', 'conv')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'session.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'session.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return sessions.map(({ day, count }) => ({
      type: AnalyticType.SESSIONS,
      created_at: new Date(day),
      value: Number(count),
    }));
  }

  private async getFunctionCalls(dto: GetAnalyticsDto): Promise<StatisticEntry[]> {
    const events = await this.dataSource
      .createQueryBuilder()
      .select('DATE(event.created_at)', 'day')
      .addSelect('COUNT(event.id)', 'count')
      .from(SystemEvent, 'event')
      .where('event.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('event.conversation_id IS NOT NULL')
      .andWhere('event.type = :type', { type: EventType.FUNCTION_CALL })
      .andWhere(dto.startDate ? 'event.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'event.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany();

    return events.map(({ day, count }) => ({
      type: AnalyticType.FUNCTION_CALLS,
      created_at: new Date(day),
      value: Number(count),
    }));
  }
}
