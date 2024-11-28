import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Departamento } from './Departamento.entity';
import { Agente } from './agent/Agente.entity';

@Entity({ name: 'chat' })
export class Chat extends BaseEntity {

  @Column({ type: 'int', nullable: false })
  departamento_id: number;

  @ManyToOne(() => Departamento, (departamento) => departamento.chats)
  @JoinColumn({ name: 'departamento_id' })
  departamento: Departamento;

  @OneToMany(() => Agente, (agente) => agente.chat)
  agentes: Agente[];
}
