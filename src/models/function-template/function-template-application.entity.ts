import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FunctionTemplateApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  domain: string;

  @Column({ default: false })
  isDynamicDomain: boolean;
}
