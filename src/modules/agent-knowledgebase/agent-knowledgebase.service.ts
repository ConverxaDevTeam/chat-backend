import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Agente } from '@models/agent/Agente.entity';
import { Funcion } from '@models/agent/Function.entity';
import { AgentManagerService } from '@modules/agent-manager/agent-manager.service';
import { FileService } from '@modules/file/file.service';
import { join } from 'path';
import { VectorStoreService } from './vector-store.service';

@Injectable()
export class AgentKnowledgebaseService {
  private readonly logger = new Logger(AgentKnowledgebaseService.name);

  constructor(
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    @InjectRepository(Agente)
    private agenteRepository: Repository<Agente>,
    private readonly agentManagerService: AgentManagerService,
    private readonly fileService: FileService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  private async ensureVectorStore(agent: Agente) {
    if (!agent.config?.vectorStoreId) {
      if (!agent.config?.agentId) throw new Error('No se pudo obtener la configuración del agente');
      if (!agent.funciones) this.logger.warn('No se encontraron funciones para el agente');

      const vectorStoreId = await this.agentManagerService.createVectorStore(agent.id);

      agent.config = {
        ...agent.config,
        vectorStoreId,
      };
      await this.agenteRepository.save(agent);
      const funciones = agent.funciones.map((f) => Object.assign(new Funcion(), f, { name: f.normalizedName }));
      const updateToolResourcesData = {
        funciones,
        add: true,
        hitl: agent.canEscalateToHuman,
      };
      this.logger.debug('updateToolResourcesData', updateToolResourcesData);
      await this.agentManagerService.updateAssistantToolResources(agent.config.agentId as string, vectorStoreId, updateToolResourcesData);
    }
    return agent.config.vectorStoreId as string;
  }

  async create(agentId: number, files: Express.Multer.File[]) {
    const queryRunner = this.knowledgeBaseRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const agent = await this.agenteRepository.findOne({
        where: { id: agentId },
        relations: ['knowledgeBases', 'funciones', 'departamento.organizacion'],
      });
      if (!agent) {
        throw new NotFoundException(`Agent with ID ${agentId} not found`);
      }

      if (!agent.departamento?.organizacion) {
        throw new NotFoundException('Agent organization not found');
      }

      const organizationId = agent.departamento.organizacion.id;
      const vectorStoreId = await this.ensureVectorStore(agent);
      const knowledgeBases: KnowledgeBase[] = [];

      for (const file of files) {
        this.logger.debug(`Processing file: ${file.originalname}`);

        // Primero subir al vector store
        const fileId = await this.agentManagerService.uploadFileToVectorStore(file, vectorStoreId);

        // Guardar archivo en local usando el fileId como nombre
        const filePath = `organizations/${organizationId}/files`;
        await this.fileService.saveFile(file, filePath, `${fileId}.${file.originalname.split('.').pop()}`);
        const knowledgeBase = new KnowledgeBase();
        knowledgeBase.filename = file.originalname;
        knowledgeBase.fileId = fileId;
        knowledgeBase.expirationTime = 7;
        knowledgeBase.agente = agent;

        await queryRunner.manager.save(knowledgeBase);
        knowledgeBases.push(knowledgeBase);

        this.logger.debug(`File processed successfully: ${file.originalname}`);
      }

      await queryRunner.commitTransaction();
      return knowledgeBases;
    } catch (error) {
      this.logger.error('Error processing files:', error);
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(agentId: number) {
    const agent = await this.agenteRepository.findOne({
      where: { id: agentId },
      relations: ['knowledgeBases'],
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    return agent.knowledgeBases;
  }

  async findOne(id: number, relations: string[] = []) {
    const knowledgeBase = await this.knowledgeBaseRepository.findOne({
      where: { id },
      relations,
    });

    if (!knowledgeBase) {
      throw new NotFoundException(`Knowledge base with ID ${id} not found`);
    }

    return knowledgeBase;
  }

  async remove(id: number) {
    const knowledgeBase = await this.findOne(id, ['agente', 'agente.funciones', 'agente.departamento.organizacion']);
    const agent = knowledgeBase.agente;

    if (!agent.config?.agentId) throw new Error('Agent ID not found in agent config');

    try {
      // Eliminar archivo del vector store
      await this.agentManagerService.deleteFileFromVectorStore(knowledgeBase.fileId);

      // Eliminar archivo local sin importar la extensión
      if (agent.departamento?.organizacion) {
        const organizationId = agent.departamento.organizacion.id;
        const directory = join(process.cwd(), 'uploads', 'organization', organizationId.toString(), 'files');
        await this.fileService.deleteFileByPattern(directory, knowledgeBase.fileId);
      }

      await this.knowledgeBaseRepository.remove(knowledgeBase);

      const hasKnowledgeBases = await this.knowledgeBaseRepository.exists({ where: { agente: { id: agent.id } } });
      // Verificar si quedan archivos en el vector store
      if (hasKnowledgeBases) return { message: 'Knowledge base deleted successfully' };

      if (agent.config?.vectorStoreId) {
        // Si no quedan archivos, eliminar el vector store y actualizar el agente
        await this.agentManagerService.deleteVectorStore(agent.config.vectorStoreId as string);

        agent.config = {
          ...agent.config,
          vectorStoreId: null,
        };
      }

      await this.agenteRepository.save(agent);
      const updateToolResourcesData = {
        funciones: agent.funciones,
        add: false,
        hitl: agent.canEscalateToHuman,
      };
      console.log('fileId to delete', knowledgeBase.fileId);
      await this.vectorStoreService.deleteDocumentsByFileId(knowledgeBase.fileId);
      await this.agentManagerService.updateAssistantToolResources(agent.config.agentId as string, null, updateToolResourcesData);

      return { message: 'Knowledge base deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting knowledge base:', error);
      throw error;
    }
  }
}
