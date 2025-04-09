import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { FunctionTemplate } from './function-template.entity';

@Entity()
export class FunctionTemplateTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => FunctionTemplate, (template) => template.tags)
  templates: FunctionTemplate[];
}
