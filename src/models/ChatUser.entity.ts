import { OneToMany, Entity, Column } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Conversation } from './Conversation.entity';
import { ChatUserData } from './ChatUserData.entity';

export enum ChatUserType {
  CHAT_WEB = 'chat_web',
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
  SLACK = 'slack',
}

@Entity({ name: 'ChatUsers' })
export class ChatUser extends BaseEntity {
  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  secret: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  identified: string;

  @Column({ type: 'enum', enum: ChatUserType, default: ChatUserType.CHAT_WEB })
  type: ChatUserType;

  @OneToMany(() => Conversation, (conversation) => conversation.chat_user)
  conversations: Conversation[];

  @OneToMany(() => ChatUserData, (chatUserData) => chatUserData.chatUser)
  customData: ChatUserData[];

  @Column({ type: 'varchar', nullable: true, default: null })
  phone: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  web: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  name: string;

  @Column({ type: 'timestamp', nullable: true })
  last_login?: Date;

  @Column({ type: 'varchar', nullable: true, default: null })
  address: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  avatar: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  email: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  browser: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  operating_system: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  ip: string;
}
