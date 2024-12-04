import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Conversation } from './Conversation.entity';

@Entity({ name: 'Messages' })
export class Message extends BaseEntity {
  @Column({ type: 'varchar', length: 255, default: null, nullable: true })
  text: string;

  @ManyToOne(() => Conversation, { eager: true })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}
