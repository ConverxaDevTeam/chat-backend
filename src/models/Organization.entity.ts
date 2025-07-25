import { Entity, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { UserOrganization } from './UserOrganization.entity';
import { Departamento } from './Departamento.entity';

export enum OrganizationType {
  PRODUCTION = 'production',
  MVP = 'mvp',
  FREE = 'free',
  CUSTOM = 'custom',
}

export enum WizardStatus {
  ORGANIZATION = 'organization',
  DEPARTMENT = 'department',
  AGENT = 'agent',
  KNOWLEDGE = 'knowledge',
  CHAT = 'chat',
  INTEGRATION = 'integration',
  LINK_WEB = 'link_web',
}

@Entity({ name: 'Organizations' })
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string | null;

  @OneToMany(() => UserOrganization, (userOrganization) => userOrganization.organization)
  userOrganizations: UserOrganization[];

  @OneToMany(() => Departamento, (departamento) => departamento.organizacion)
  departamentos: Departamento[];

  @Column({ type: 'enum', enum: OrganizationType, default: OrganizationType.PRODUCTION })
  type: OrganizationType;

  @Column({ type: 'int', default: 0 })
  conversationCount: number;

  @Column({ type: 'enum', enum: WizardStatus, default: WizardStatus.ORGANIZATION })
  wizardStatus: WizardStatus;

  @DeleteDateColumn()
  deletedAt: Date;
}
