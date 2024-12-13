import { Entity, Column, ManyToOne, JoinColumn, Unique, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Agente } from './Agente.entity';
import { Autenticador } from './Autenticador.entity';
import { FunctionType } from 'src/interfaces/function.interface';

@Entity({ name: 'funcion' })
@Unique(['normalizedName', 'agente'])
export class Funcion extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  normalizedName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: FunctionType, nullable: false })
  type: FunctionType;

  @Column({ type: 'json', nullable: true })
  config: Record<string, unknown>;

  @ManyToOne(() => Agente, (agente) => agente.funciones)
  @JoinColumn({ name: 'agent_id' })
  agente: Agente;

  @ManyToOne(() => Autenticador, (autenticador) => autenticador.funciones)
  @JoinColumn({ name: 'autenticador' })
  autenticador: Autenticador;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeNameField() {
    this.normalizedName = this.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_{2,}/g, '_');
  }
}
