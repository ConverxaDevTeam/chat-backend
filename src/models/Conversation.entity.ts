import { Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Entity } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { ChatUser } from './ChatUser.entity';
import { Message } from './Message.entity';
import { Departamento } from './Departamento.entity';
import { IntegrationType } from './Integration.entity';
import { User } from './User.entity';

@Entity({ name: 'Conversations' })
export class Conversation extends BaseEntity {
  @Column({ type: 'boolean', default: false })
  user_deleted: boolean;

  @Column({ type: 'enum', enum: IntegrationType, default: IntegrationType.CHAT_WEB })
  type: IntegrationType;

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
}
