export interface IKnowledgeBaseDocument {
  id: string;
  content: string;
  embedding: string;
  fileId: string;
  agentId: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export function createKnowledgeBaseTableSQL(): string {
  return `
    CREATE TABLE IF NOT EXISTS knowledge_base_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      embedding vector(1024) NOT NULL,
      fileId TEXT NOT NULL,
      agentId INTEGER NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      createdAt TIMESTAMP DEFAULT NOW(),
      updatedAt TIMESTAMP DEFAULT NOW()
    );
  `;
}
