import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Funcion } from './Function.entity';
import { AgenteType } from 'src/interfaces/agent';
import { Departamento } from '@models/Departamento.entity';
import { KnowledgeBase } from './KnowledgeBase.entity';

@Entity({ name: 'agente' })
export class Agente<T extends { type: AgenteType; config: Record<string, unknown> } = { type: AgenteType; config: Record<string, unknown> }> extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'enum', enum: AgenteType, nullable: false })
  type: T['type'];

  @Column({ type: 'json', nullable: true })
  config: T['config'];

  @Column({ type: 'boolean', default: true })
  canEscalateToHuman: boolean;

  @OneToOne(() => Departamento, (departamento) => departamento.agente)
  @JoinColumn({ name: 'departamento_id' })
  departamento: Departamento;

  @OneToMany(() => Funcion, (funcion) => funcion.agente)
  funciones: Funcion[];

  @OneToMany(() => KnowledgeBase, (knowledgeBase) => knowledgeBase.agente)
  knowledgeBases: KnowledgeBase[];
}
