import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Chat } from './Chat.entity';

@Entity({ name: 'departamento' })
export class Departamento extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  organization_id: string;

  @OneToMany(() => Chat, (chat) => chat.departamento)
  chats: Chat[];
}
