import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Organization } from './Organization.entity';
import { User } from './User.entity';
import { UserHitlType } from './UserHitlType.entity';

@Entity('hitl_types')
export class HitlType extends BaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column()
  organization_id: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  created_by: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => UserHitlType, (userHitlType) => userHitlType.hitlType)
  userHitlTypes: UserHitlType[];
}
