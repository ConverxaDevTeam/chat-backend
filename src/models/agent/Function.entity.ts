import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Agente } from './Agente.entity';
import { Autenticador } from './Autenticador.entity';

@Entity({ name: 'funcion' })
export class Funcion extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'enum', enum: ['type1', 'type2'], nullable: false }) // Ajusta los tipos del enum según tu aplicación
  type: string;

  @Column({ type: 'json', nullable: true })
  config: Record<string, unknown>;

  @ManyToOne(() => Agente, (agente) => agente.funciones)
  @JoinColumn({ name: 'agent_id' })
  agente: Agente;

  @ManyToOne(() => Autenticador, (autenticador) => autenticador.funciones)
  @JoinColumn({ name: 'autenticador' })
  autenticador: Autenticador;

  @Column({ type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;
}
