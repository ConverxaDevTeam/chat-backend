import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Departamento } from './Departamento.entity';

export enum IntegrationType {
  CHAT_WEB = 'chat_web',
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
}

@Entity({ name: 'Integrations' })
export class Integration extends BaseEntity {
  @Column({ type: 'json', default: '{}' })
  config: string;

  @Column({ type: 'enum', enum: IntegrationType })
  type: IntegrationType;

  @ManyToOne(() => Departamento, { eager: true })
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;
}
