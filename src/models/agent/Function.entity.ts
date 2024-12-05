import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Agente } from './Agente.entity';
import { Autenticador } from './Autenticador.entity';
import { FunctionType } from 'src/interfaces/function.interface';

@Entity({ name: 'funcion' })
export class Funcion extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: FunctionType, nullable: false }) // Ajusta los tipos del enum según tu aplicación
  type: FunctionType;

  @Column({ type: 'json', nullable: true })
  config: Record<string, unknown>;

  @ManyToOne(() => Agente, (agente) => agente.funciones)
  @JoinColumn({ name: 'agent_id' })
  agente: Agente;

  @ManyToOne(() => Autenticador, (autenticador) => autenticador.funciones)
  @JoinColumn({ name: 'autenticador' })
  autenticador: Autenticador;
}
