import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Chat } from '../Chat.entity';
import { Funcion } from './Function.entity';

@Entity({ name: 'agente' })
export class Agente extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  type: string;

  @Column({ type: 'json', nullable: true })
  config: Record<string, unknown>;

  @ManyToOne(() => Chat, (chat) => chat.agentes)
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @OneToMany(() => Funcion, (funcion) => funcion.agente)
  funciones: Funcion[];

  @Column({ type: 'timestamp', nullable: true })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;
}
