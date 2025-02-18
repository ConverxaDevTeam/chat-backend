import { Entity, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { UserOrganization } from './UserOrganization.entity';
import { Departamento } from './Departamento.entity';

enum OrganizationType {
  PRODUCTION = 'production',
  MVP = 'mvp',
}

@Entity({ name: 'Organizations' })
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @OneToMany(() => UserOrganization, (userOrganization) => userOrganization.organization)
  userOrganizations: UserOrganization[];

  @OneToMany(() => Departamento, (departamento) => departamento.organizacion)
  departamentos: Departamento[];

  @Column({ type: 'enum', enum: OrganizationType, default: OrganizationType.PRODUCTION })
  type: OrganizationType;

  @DeleteDateColumn()
  deletedAt: Date;
}
