import { Entity, Column, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './Base.entity';
import { Departamento } from './Departamento.entity';
import { Conversation } from './Conversation.entity';

export enum IntegrationType {
  CHAT_WEB = 'chat_web',
  WHATSAPP = 'whatsapp',
  MESSENGER = 'messenger',
  SLACK = 'slack',
  MESSENGER_MANUAL = 'messenger_manual',
}

@Entity({ name: 'Integrations' })
export class Integration extends BaseEntity {
  @Column({ type: 'json', default: '"{}"' })
  config: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  token: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  phone_number_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  waba_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  page_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  team_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  authed_user_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  bot_user_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  team_name: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  slack_channel_id: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  slack_channel_name: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  refresh_token: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  code_webhook: string;

  @Column({ type: 'boolean', nullable: true, default: false, select: false })
  validated_webhook: boolean;

  @Column({ type: 'enum', enum: IntegrationType })
  type: IntegrationType;

  @ManyToOne(() => Departamento, { eager: true })
  @JoinColumn({ name: 'departamentoId' })
  departamento: Departamento;

  @OneToMany(() => Conversation, (conversation) => conversation.integration)
  conversations: Conversation[];
}
