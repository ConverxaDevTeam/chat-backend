import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { User } from './User.entity';
import { HitlType } from './HitlType.entity';
import { Organization } from './Organization.entity';

@Entity('user_hitl_types')
export class UserHitlType extends BaseEntity {
  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  hitl_type_id: number;

  @ManyToOne(() => HitlType)
  @JoinColumn({ name: 'hitl_type_id' })
  hitlType: HitlType;

  @Column()
  organization_id: number;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
