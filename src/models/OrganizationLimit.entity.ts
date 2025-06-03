import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Organization } from './Organization.entity';

@Entity({ name: 'OrganizationLimits' })
export class OrganizationLimit extends BaseEntity {
  @Column({ type: 'int', nullable: false, default: 50 })
  conversationLimit: number;

  @Column({ type: 'int', nullable: false, default: 15 })
  durationDays: number;

  @Column({ type: 'boolean', nullable: false, default: false })
  isMonthly: boolean;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ type: 'int', nullable: false })
  organizationId: number;
}
