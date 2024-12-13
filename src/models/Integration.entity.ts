import { Entity, Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Departamento } from './Departamento.entity';
import { Conversation } from './Conversation.entity';

export enum IntegrationType {
  CHAT_WEB = 'chat_web',
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
}

@Entity({ name: 'Integrations' })
export class Integration extends BaseEntity {
  @Column({ type: 'json', default: '{}' })
  config: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  token: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  phone_number_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  waba_id: string;

  @Column({ type: 'enum', enum: IntegrationType })
  type: IntegrationType;

  @ManyToOne(() => Departamento, { eager: true })
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;

  @OneToMany(() => Conversation, (conversation) => conversation.integration)
  conversations: Conversation[];
}
