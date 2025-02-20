import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from '@models/notification.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Notification | null> {
    return this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async create(notification: Partial<Notification>): Promise<Notification> {
    const newNotification = this.notificationRepository.create(notification);
    return this.notificationRepository.save(newNotification);
  }

  async markAsRead(id: number): Promise<Notification | null> {
    await this.notificationRepository.update(id, {
      status: NotificationStatus.READ,
    });
    return this.findOne(id);
  }

  async createNotificationForOrganization(organizationId: number, type: NotificationType, title: string): Promise<Notification> {
    const notification = this.notificationRepository.create({
      organizationId,
      type,
      title,
      link: `${this.configService.get('url.frontend')}/conversation/detail/${organizationId}`,
    });
    return this.notificationRepository.save(notification);
  }

  async createNotificationForUser(userId: number, type: NotificationType, title: string, organizationId: number): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user: { id: userId },
      type,
      title,
      organizationId,
      status: NotificationStatus.UNREAD,
      link: `${this.configService.get('url.frontend')}/conversation/detail/${organizationId}`,
    });
    return this.notificationRepository.save(notification);
  }

  async findUnreadNotifications(userId: number): Promise<Notification[]> {
    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('(notification.userId = :userId OR notification.userId IS NULL)', { userId })
      .andWhere('notification.status = :status', { status: NotificationStatus.UNREAD })
      .orderBy('notification.created_at', 'DESC')
      .getMany();
  }
}
