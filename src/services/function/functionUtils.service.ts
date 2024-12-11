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
    const sofiaLLMId = functions[0].agente.config.agentId as string;

    const llmService = new SofiaLLMService(this.functionCallService, { type: AgentIdentifierType.CHAT }, functions[0].agente.config as any);
    await llmService.updateFunctions(functions, sofiaLLMId);
  }
}
