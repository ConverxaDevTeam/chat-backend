import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Message } from './Message.entity';
import { Conversation } from './Conversation.entity';

export enum ChatSessionStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity({ name: 'ChatSessions' })
export class ChatSession extends BaseEntity {
  @Column({ type: 'enum', enum: ChatSessionStatus, default: ChatSessionStatus.ACTIVE })
  status: ChatSessionStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastInteractionAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  conversationId: number;

  @OneToMany(() => Message, (message) => message.chatSession)
  messages: Message[];
}
