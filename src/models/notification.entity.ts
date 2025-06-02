import { Column, Entity, ManyToOne } from 'typeorm';
import { User } from './User.entity';
import { BaseEntity } from './Base.entity';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  USER = 'USER',
  CUSTOM_PLAN_REQUEST = 'CUSTOM_PLAN_REQUEST',
}

export enum NotificationStatus {
  READ = 'READ',
  UNREAD = 'UNREAD',
}

@Entity()
export class Notification extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column()
  organizationId: number;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  link: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => User, { nullable: true })
  user: User | null;
}
