import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { ChatUser } from './ChatUser.entity';

@Entity({ name: 'ChatUserData' })
@Index(['chat_user_id', 'key'], { unique: true })
export class ChatUserData extends BaseEntity {
  @Column({ type: 'integer', nullable: false })
  chat_user_id: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  key: string;

  @Column({ type: 'text', nullable: false })
  value: string;

  @ManyToOne(() => ChatUser, (chatUser) => chatUser.customData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_user_id' })
  chatUser: ChatUser;
}
