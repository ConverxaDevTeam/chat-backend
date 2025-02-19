import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus, NotificationType } from '@models/notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
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
    });
    return this.notificationRepository.save(notification);
  }
}
