import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Conversation } from './Conversation.entity';

export enum MessageType {
  USER = 'user',
  AGENT = 'agent',
}
@Entity({ name: 'Messages' })
export class Message extends BaseEntity {
  @Column({ type: 'varchar', default: null, nullable: true })
  text: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.USER })
  type: MessageType;

  @ManyToOne(() => Conversation, { eager: true })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;
}
