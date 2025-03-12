import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('knowledge_base_documents')
export class KnowledgeBaseDocument {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'fileId' })
  fileId: string;

  @Column({ name: 'agentId' })
  agentId: number;

  @Column()
  embedding: string;

  @Column({ type: 'jsonb' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
