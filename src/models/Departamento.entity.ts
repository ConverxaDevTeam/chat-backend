import { Entity, Column, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Chat } from './Chat.entity';
import { Organization } from './Organization.entity';

@Entity({ name: 'departamento' })
export class Departamento extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;


  @ManyToOne(() => Organization, (organizacion) => organizacion.departamentos)
  @JoinColumn({ name: 'organization_id' })
  organizacion: Organization;

  @OneToMany(() => Chat, (chat) => chat.departamento)
  chats: Chat[];
}
