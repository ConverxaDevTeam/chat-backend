import { OneToMany, Entity, Column } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Conversation } from './Conversation.entity';

export enum ChatUserType {
  CHAT_WEB = 'chat_web',
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
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
}
