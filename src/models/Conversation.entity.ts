import { Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Entity } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { ChatUser } from './ChatUser.entity';
import { Message } from './Message.entity';
import { Departamento } from './Departamento.entity';
import { Integration } from './Integration.entity';

export enum ConversationType {
  CHAT_WEB = 'chat_web',
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
  SLACK = 'slack',
}
import { User } from './User.entity';

@Entity({ name: 'Conversations' })
export class Conversation extends BaseEntity {
  @Column({ type: 'boolean', default: false })
  user_deleted: boolean;

  @Column({ type: 'enum', enum: ConversationType, default: ConversationType.CHAT_WEB })
  type: ConversationType;

  @Column({ type: 'json', nullable: true })
  config: Record<string, any>;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'boolean', default: false })
  need_human: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_call: Date;

  @ManyToOne(() => ChatUser)
  @JoinColumn({ name: 'chatUserId' })
  chat_user: ChatUser;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @ManyToOne(() => Departamento)
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;

  @ManyToOne(() => Integration, (integration) => integration.conversations, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'integrationId' })
  integration: Integration | null;
}
