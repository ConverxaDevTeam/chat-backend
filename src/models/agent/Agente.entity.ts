import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Chat } from '../Chat.entity';
import { Funcion } from './Function.entity';
import { AgenteType } from 'src/interfaces/agent';


@Entity({ name: 'agente' })
export class Agente extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: AgenteType,
    nullable: false,
  })
  type: AgenteType;

  @Column({ type: 'json', nullable: true })
  config: Record<string, unknown>;

  @ManyToOne(() => Chat, (chat) => chat.agentes)
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @OneToMany(() => Funcion, (funcion) => funcion.agente)
  funciones: Funcion[];
}
