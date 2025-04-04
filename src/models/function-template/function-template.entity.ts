import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { FunctionTemplateCategory } from './function-template-category.entity';
import { FunctionTemplateApplication } from './function-template-application.entity';

type ParamType = 'string' | 'number' | 'boolean' | 'object';

interface FunctionTemplateParam {
  name: string;
  title: string;
  description?: string;
  type: ParamType;
  required?: boolean;
  enumValues?: string[];
  defaultValue?: any;
  properties?: FunctionTemplateParam[];
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

  @Column('simple-array')
  tags: string[];

  @Column()
  url: string;

  @Column({ default: 'GET' })
  method: string;

  @Column({ default: 'json' })
  bodyType: string;

  @Column('jsonb')
  params: FunctionTemplateParam[];

  @Column()
  organizationId: number;
}
