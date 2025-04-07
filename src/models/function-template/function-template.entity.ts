import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { FunctionTemplateCategory } from './function-template-category.entity';
import { FunctionTemplateApplication } from './function-template-application.entity';
import { FunctionTemplateTag } from './function-template-tag.entity';
import { ParamType } from 'src/interfaces/function-param.interface';

interface FunctionTemplateParam {
  name: string;
  title: string;
  description?: string;
  type: ParamType;
  required?: boolean;
  enumValues?: string[];
  defaultValue?: any;
  properties?: Record<string, FunctionTemplateParam>;
}

@Entity()
export class FunctionTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => FunctionTemplateCategory)
  @JoinColumn({ name: 'categoryId' })
  category: FunctionTemplateCategory;

  @Column()
  categoryId: number;

  @ManyToOne(() => FunctionTemplateApplication)
  @JoinColumn({ name: 'applicationId' })
  application: FunctionTemplateApplication;

  @Column()
  applicationId: number;

  @ManyToMany(() => FunctionTemplateTag, (tag) => tag.templates)
  @JoinTable()
  tags: FunctionTemplateTag[];

  @Column()
  url: string;

  @Column({ default: 'GET' })
  method: string;

  @Column({ default: 'json' })
  bodyType: string;

  @Column({ type: 'simple-json', nullable: true })
  params: Record<string, FunctionTemplateParam>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
