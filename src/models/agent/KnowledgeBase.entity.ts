import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../Base.entity';
import { Agente } from './Agente.entity';

@Entity({ name: 'knowledge_base' })
export class KnowledgeBase extends BaseEntity {
  @Column({ type: 'varchar', length: 50, nullable: false })
  fileId: string;

  @Column({ type: 'integer', nullable: true })
  expirationTime: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  filename: string;

  @ManyToOne(() => Agente, (agente) => agente.knowledgeBases)
  @JoinColumn({ name: 'agent_id' })
  agente: Agente;
}
