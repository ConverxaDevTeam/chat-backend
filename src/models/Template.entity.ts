import { Entity, Column, ManyToOne } from 'typeorm';
import { Departamento } from './Departamento.entity';
import { BaseEntity } from './Base.entity';

@Entity()
export class Template extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToOne(() => Departamento, { nullable: false })
  sourceDepartment: Departamento;

  @Column()
  sourceDepartmentId: number;
}
