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
      .addSelect('MAX(session.created_at)', 'date')
      .from(ChatUser, 'chatUser')
      .innerJoin('chatUser.conversations', 'conv')
      .innerJoin('conv.messages', 'messages')
      .innerJoin('messages.chatSession', 'session')
      .innerJoin('conv.departamento', 'departamento')
      .where('departamento.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere(dto.startDate ? 'session.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'session.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .groupBy('chatUser.id')
      .having('COUNT(DISTINCT session.id) > 1')
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
      .andWhere('message.type = :type', { type: MessageType.AGENT })
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
      .andWhere('message.type = :type', { type: MessageType.HITL })
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
      .select('session.id', 'id')
      .addSelect('session.created_at', 'date')
      .from(ChatSession, 'session')
      .innerJoin('session.messages', 'message')
      .innerJoin('message.conversation', 'conv')
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
    const events = await this.dataSource
      .createQueryBuilder()
      .select('event.created_at', 'date')
      .from(SystemEvent, 'event')
      .where('event.organization_id = :organizationId', { organizationId: dto.organizationId })
      .andWhere('event.conversation_id IS NOT NULL')
      .andWhere('event.type = :type', { type: EventType.FUNCTION_CALL })
      .andWhere(dto.startDate ? 'event.created_at >= :startDate' : '1=1', { startDate: dto.startDate })
      .andWhere(dto.endDate ? 'event.created_at <= :endDate' : '1=1', { endDate: dto.endDate })
      .orderBy('event.created_at', 'DESC')
      .getRawMany();

    return events.map(({ date }) => ({
      type: AnalyticType.FUNCTION_CALLS,
      created_at: new Date(date),
      value: 1,
    }));
  }
}
