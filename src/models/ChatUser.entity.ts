import { OneToMany, Entity, Column } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Conversation } from './Conversation.entity';

@Entity({ name: 'ChatUsers' })
export class ChatUser extends BaseEntity {
  @Column({ type: 'varchar', length: 128, nullable: false, select: false })
  secret: string;

  @OneToMany(() => Conversation, (conversation) => conversation.chat_user)
  conversations: Conversation[];
}
