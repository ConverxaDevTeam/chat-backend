import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseDocument } from '@models/agent/KnowledgeBaseDocument.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VectorStoreService {
  constructor(
    @InjectRepository(KnowledgeBaseDocument)
    private readonly knowledgeBaseDocumentRepository: Repository<KnowledgeBaseDocument>,
  ) {}

  /**
   * Guarda documentos con sus embeddings en la base de datos
   * @param documents Textos de los documentos
   * @param embeddings Embeddings correspondientes a cada documento
   * @param fileIds IDs de los archivos a los que pertenecen los documentos
   * @param agentId ID del agente asociado
   * @param metadata Metadatos adicionales
   * @returns Array de documentos guardados
   */
  async saveDocumentsWithEmbeddings(
    documents: string[],
    embeddings: number[][],
    fileIds: string[],
    agentId: number,
    metadata: Record<string, any> = {},
  ): Promise<KnowledgeBaseDocument[]> {
    if (documents.length !== embeddings.length || documents.length !== fileIds.length) {
      throw new Error('La cantidad de documentos, embeddings y fileIds debe ser igual');
    }

    const documentsToSave = documents.map((content, index) => {
      const doc = new KnowledgeBaseDocument();
      doc.id = uuidv4();
      doc.content = content;
      doc.fileId = fileIds[index];
      doc.agentId = agentId;
      doc.embedding = JSON.stringify(embeddings[index]);
      doc.metadata = { ...metadata, index };
      return doc;
    });

    return this.knowledgeBaseDocumentRepository.save(documentsToSave);
  }

  /**
   * Elimina documentos por fileId
   * @param fileId ID del archivo
   * @returns Resultado de la operación
   */
  async deleteDocumentsByFileId(fileId: string): Promise<void> {
    await this.knowledgeBaseDocumentRepository.delete({ fileId });
  }

  /**
   * Obtiene documentos por fileId
   * @param fileId ID del archivo
   * @returns Array de documentos
   */
  async getDocumentsByFileId(fileId: string): Promise<KnowledgeBaseDocument[]> {
    return this.knowledgeBaseDocumentRepository.find({ where: { fileId } });
  }

  /**
   * Obtiene documentos por agentId
   * @param agentId ID del agente
   * @returns Array de documentos
   */
  async getDocumentsByAgentId(agentId: number): Promise<KnowledgeBaseDocument[]> {
    return this.knowledgeBaseDocumentRepository.find({ where: { agentId } });
  }

  /**
   * Busca documentos similares a una consulta por agentId
   * @param queryEmbedding Embedding de la consulta
   * @param agentId ID del agente
   * @param limit Número máximo de resultados
   * @returns Array de documentos
   */
  async findSimilarDocumentsByAgentId(queryEmbedding: number[], agentId: number, limit: number = 5): Promise<KnowledgeBaseDocument[]> {
    const documents = await this.getDocumentsByAgentId(agentId);
    // En una implementación futura, aquí se podría calcular la similitud
    // entre queryEmbedding y los embeddings de los documentos
    return documents.slice(0, limit);
  }
}
