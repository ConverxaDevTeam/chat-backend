import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { SofiaLLMService } from '../llm-agent/sofia-llm.service';
import { AgentIdentifierType } from 'src/interfaces/agent';
import { FunctionCallService } from '../function-call.service';

@Injectable()
export class FunctionUtilsService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    private readonly functionCallService: FunctionCallService,
  ) {}

  async updateLLMFunctions(agentId: number): Promise<void> {
    const functions = await this.functionRepository.find({
      where: { agente: { id: agentId } },
      relations: ['agente'],
    });

    if (!functions[0]?.agente?.config?.agentId) throw new Error('No se pudo obtener la configuración del agente');

    const config = functions[0].agente.config;
    if (!config.instruccion) throw new Error('No se encontró la instrucción del agente');

    const agentConfig = {
      instruccion: config.instruccion as string,
      agentId: config.agentId as string,
      vectorStoreId: config.vectorStoreId,
    };

    const llmService = new SofiaLLMService(this.functionCallService, { type: AgentIdentifierType.CHAT }, agentConfig);

    const functionsWithNormalizedNames = functions.map((f) => Object.assign(f, { name: f.normalizedName }));
    await llmService.updateFunctions(functionsWithNormalizedNames, agentConfig.agentId!, !!agentConfig.vectorStoreId);
  }
}
