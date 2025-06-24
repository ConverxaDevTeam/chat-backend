import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FunctionTemplateCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
