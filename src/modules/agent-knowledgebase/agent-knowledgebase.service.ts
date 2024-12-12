import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBase } from '@models/agent/KnowledgeBase.entity';
import { Agente } from '@models/agent/Agente.entity';
import { SofiaLLMService } from 'src/services/llm-agent/sofia-llm.service';

@Injectable()
export class AgentKnowledgebaseService {
  private readonly logger = new Logger(AgentKnowledgebaseService.name);

  constructor(
    @InjectRepository(KnowledgeBase)
    private knowledgeBaseRepository: Repository<KnowledgeBase>,
    @InjectRepository(Agente)
    private agenteRepository: Repository<Agente>,
    private readonly sofiaLLMService: SofiaLLMService,
  ) {}

  private async updateAssistantTools(agent: Agente) {
    if (!agent || !agent.config?.agentId) return;

    const vectorStoreIds = agent.knowledgeBases.map((kb) => kb.vectorStoreId);
    this.logger.debug(`Updating assistant tools with vector store IDs: ${vectorStoreIds}`);
    await this.sofiaLLMService.updateAssistantToolResources(agent.config.agentId as string, vectorStoreIds);
  }

  async create(agentId: number, files: Express.Multer.File[]) {
    const agent = await this.agenteRepository.findOne({ where: { id: agentId }, relations: ['knowledgeBases'] });
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    try {
      const queryRunner = this.knowledgeBaseRepository.manager.connection.createQueryRunner();

      await queryRunner.startTransaction();
      const knowledgeBase = new KnowledgeBase();
      try {
        for (const file of files) {
          this.logger.debug(`Processing file: ${file.originalname}`);

          const fileId = await this.sofiaLLMService.uploadFileToAssistant(file, agent.id);

          knowledgeBase.vectorStoreId = fileId;
          knowledgeBase.filename = file.originalname;
          knowledgeBase.expirationTime = 7;
          knowledgeBase.agente = agent;

          await queryRunner.manager.save(knowledgeBase);
          agent.knowledgeBases.push(knowledgeBase);
          this.logger.debug(`File processed successfully: ${file.originalname}, ID: ${fileId}`);
        }

        await this.updateAssistantTools(agent);

        await queryRunner.commitTransaction();

        return { id: knowledgeBase.id, filename: knowledgeBase.filename, expirationTime: knowledgeBase.expirationTime };
      } catch (error) {
        this.logger.error('Error processing files:', error);
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('Error processing files:', error);
      throw error;
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
    const knowledgeBase = await this.findOne(id, ['agente']);

    try {
      await this.sofiaLLMService.deleteFileFromAssistant(knowledgeBase.vectorStoreId);
      this.logger.debug(`File deleted from OpenAI: ${knowledgeBase.vectorStoreId}`);
    } catch (error) {
      this.logger.error(`Error deleting file from OpenAI: ${error.message}`);
      throw error;
    }

    await this.knowledgeBaseRepository.remove(knowledgeBase);
    await this.updateAssistantTools(knowledgeBase.agente);
    return { message: 'Knowledge base deleted successfully' };
  }
}
