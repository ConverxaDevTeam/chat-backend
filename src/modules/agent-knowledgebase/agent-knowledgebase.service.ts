import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Agente } from '@models/agent/Agente.entity';
import { Funcion } from '@models/agent/Function.entity';
import { AgentManagerService } from '@modules/agent-manager/agent-manager.service';

@Injectable()
export class AgentKnowledgebaseService {
  private readonly logger = new Logger(AgentKnowledgebaseService.name);

  constructor(
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    @InjectRepository(Agente)
    private agenteRepository: Repository<Agente>,
    private readonly agentManagerService: AgentManagerService,
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
        relations: ['knowledgeBases', 'funciones'],
      });
      if (!agent) {
        throw new NotFoundException(`Agent with ID ${agentId} not found`);
      }

      const vectorStoreId = await this.ensureVectorStore(agent);
      const knowledgeBases: KnowledgeBase[] = [];

      for (const file of files) {
        this.logger.debug(`Processing file: ${file.originalname}`);

        const fileId = await this.agentManagerService.uploadFileToVectorStore(file, vectorStoreId);

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
    const knowledgeBase = await this.findOne(id, ['agente', 'agente.funciones']);
    const agent = knowledgeBase.agente;

    if (!agent.config?.vectorStoreId) throw new Error('Vector store ID not found in agent config');
    if (!agent.config?.agentId) throw new Error('Agent ID not found in agent config');
    try {
      await this.agentManagerService.deleteFileFromVectorStore(knowledgeBase.fileId);

      await this.knowledgeBaseRepository.remove(knowledgeBase);

      const hasKnowledgeBases = await this.knowledgeBaseRepository.exists({ where: { agente: { id: agent.id } } });
      // Verificar si quedan archivos en el vector store
      if (hasKnowledgeBases) return { message: 'Knowledge base deleted successfully' };
      // Si no quedan archivos, eliminar el vector store y actualizar el agente
      await this.agentManagerService.deleteVectorStore(agent.config.vectorStoreId as string);

      agent.config = {
        ...agent.config,
        vectorStoreId: null,
      };
      await this.agenteRepository.save(agent);
      const updateToolResourcesData = {
        funciones: agent.funciones,
        add: false,
        hitl: agent.canEscalateToHuman,
      };
      await this.agentManagerService.updateAssistantToolResources(agent.config.agentId as string, null, updateToolResourcesData);

      return { message: 'Knowledge base deleted successfully' };
    } catch (error) {
      this.logger.error('Error deleting knowledge base:', error);
      throw error;
    }
  }
}
