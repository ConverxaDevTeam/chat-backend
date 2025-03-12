import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { toSql } from 'pgvector';
import { DataSource } from 'typeorm';

@Injectable()
export class VectorStoreService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Guarda documentos con sus embeddings en la base de datos
   * @param documents Textos de los documentos
   * @param embeddings Embeddings correspondientes a cada documento
   * @param fileIds IDs de los archivos a los que pertenecen los documentos
   * @param agentId ID del agente asociado
   * @param metadata Metadatos adicionales
   * @returns Array de documentos guardados
   */
  async saveDocumentsWithEmbeddings(documents: string[], embeddings: number[][], fileIds: string[], agentId: number, metadata: Record<string, any> = {}): Promise<void> {
    const query = `
      INSERT INTO knowledge_base_documents 
      (id, content, embedding, fileId, agentId, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await Promise.all(
      documents.map((content, index) => {
        const params = [uuidv4(), content, `[${embeddings[index].join(',')}]`, fileIds[index], agentId, JSON.stringify({ ...metadata, index })];
        return this.dataSource.query(query, params);
      }),
    );
  }

  /**
   * Elimina documentos por fileId
   * @param fileId ID del archivo
   * @returns Resultado de la operación
   */
  async deleteDocumentsByFileId(fileId: string): Promise<void> {
    await this.dataSource.query('DELETE FROM knowledge_base_documents WHERE fileid = $1', [fileId]);
  }

  async getFileIdsByAgentId(agentId: number, fileIds: string[]): Promise<string[]> {
    // Execute query with error handling
    try {
      const existingIds = await this.dataSource
        .query<{ fileid: string }[]>('SELECT DISTINCT fileId FROM knowledge_base_documents WHERE agentid = $1', [agentId])
        .then((results) => {
          return results.map((r) => r.fileid).filter(Boolean);
        });

      return [...new Set(fileIds)].filter((id) => !existingIds.includes(id));
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Busca documentos similares a una consulta por agentId
   * @param queryEmbedding Embedding de la consulta
   * @param agentId ID del agente
   * @param limit Número máximo de resultados
   * @returns Array de documentos
   */
  async findSimilarDocumentsByAgentId(queryEmbedding: number[], agentId: number, limit: number = 5): Promise<any[]> {
    const query = `
      SELECT *, embedding <-> $1 AS distance
      FROM knowledge_base_documents
      WHERE agentId = $2
      ORDER BY distance
      LIMIT $3
    `;
    return this.dataSource.query(query, [toSql(queryEmbedding), agentId, limit]);
  }
}
