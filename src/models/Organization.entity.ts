import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { UserOrganization } from './UserOrganization.entity';
import { Departamento } from './Departamento.entity';

@Entity({ name: 'Organizations' })
export class Organization extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  description: string;

  @OneToMany(() => UserOrganization, (userOrganization) => userOrganization.organization)
  userOrganizations: UserOrganization[];
  @OneToMany(() => Departamento, (departamento) => departamento.organizacion)
  departamentos: Departamento[];
}
