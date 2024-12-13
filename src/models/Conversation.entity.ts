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

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ManyToOne(() => ChatUser, { eager: true })
  @JoinColumn({ name: 'chatUserId' })
  chat_user: ChatUser;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @ManyToOne(() => Departamento, { eager: true })
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;

  @ManyToOne(() => Integration, { eager: true })
  @JoinColumn({ name: 'integrationId' })
  integration: Integration;
}
