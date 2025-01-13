import { Index, OneToMany, Column, Entity, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Session } from './Session.entity';
import { UserOrganization } from './UserOrganization.entity';
import { Conversation } from './Conversation.entity';

@Entity({ name: 'Users' })
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'varchar', length: 128, nullable: false, select: false })
  password: string;

  @Column({ type: 'boolean', default: false })
  is_super_admin: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login?: Date;

  @Column({ type: 'varchar', length: 255, default: null, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 255, default: null, nullable: true })
  last_name: string;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => UserOrganization, (userOrganization) => userOrganization.user)
  userOrganizations: UserOrganization[];

  @OneToMany(() => Conversation, (conversation) => conversation.user)
  conversations: Conversation[];
}
