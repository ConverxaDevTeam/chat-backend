import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Conversation } from './Conversation.entity';
import { ChatSession } from './ChatSession.entity';

export enum MessageType {
  USER = 'user',
  AGENT = 'agent',
  HITL = 'hitl',
}

export enum MessageFormatType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
}

@Entity({ name: 'Messages' })
export class Message extends BaseEntity {
  @Column({ type: 'varchar', default: null, nullable: true })
  text: string;

  @Column({ type: 'varchar', default: null, nullable: true })
  audio: string;

  @Column({ type: 'json', default: null, nullable: true })
  images: string[];

  @Column({ type: 'enum', enum: MessageType, default: MessageType.USER })
  type: MessageType;

  @Column({ type: 'enum', enum: MessageFormatType, default: MessageFormatType.TEXT })
  format: MessageFormatType;

  @ManyToOne(() => Conversation, { eager: true })
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => ChatSession, { eager: true })
  @JoinColumn({ name: 'chatSessionId' })
  chatSession: ChatSession;
}
