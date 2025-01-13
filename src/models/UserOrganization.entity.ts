import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, DeleteDateColumn } from 'typeorm';
import { User } from './User.entity';
import { Organization } from './Organization.entity';

export enum OrganizationRoleType {
  ADMIN = 'admin',
  ING_PREVENTA = 'ing_preventa',
  USR_TECNICO = 'usr_tecnico',
  OWNER = 'owner',
  SUPERVISOR = 'supervisor',
  HITL = 'hitl',
  USER = 'user',
}

@Entity({ name: 'UserOrganizations' })
export class UserOrganization {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userOrganizations, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Organization, (organization) => organization.userOrganizations, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  organization?: Organization | null;

  @Column({ type: 'enum', enum: OrganizationRoleType, default: OrganizationRoleType.USER })
  role: OrganizationRoleType;

  @DeleteDateColumn()
  deletedAt: Date;
}
