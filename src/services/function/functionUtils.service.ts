import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { SofiaLLMService } from '../llm-agent/sofia-llm.service';
import { AgentIdentifierType } from 'src/interfaces/agent';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { SystemEventsService } from '@modules/system-events/system-events.service';

@Injectable()
export class FunctionUtilsService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    private readonly functionCallService: FunctionCallService,
    private readonly systemEventsService: SystemEventsService,
  ) {}

  async updateLLMFunctions(agentId: number): Promise<void> {
    const functions = await this.functionRepository.find({
      where: { agente: { id: agentId } },
      relations: ['agente', 'agente.departamento', 'agente.departamento.organizacion'],
    });

    if (!functions[0]?.agente?.config?.agentId) throw new Error('No se pudo obtener la configuración del agente');
    const agent = functions[0].agente;
    if (!agent.config.instruccion) throw new Error('No se encontró la instrucción del agente');

    if (!agent.departamento.organizacion.id) throw new Error('No se pudo obtener la organización');

    const agentConfig = {
      instruccion: agent.config.instruccion as string,
      agentId: agent.config.agentId as string,
      vectorStoreId: agent.config.vectorStoreId,
      organizationId: agent.departamento.organizacion.id,
    };

    const llmService = new SofiaLLMService(
      this.functionCallService,
      this.systemEventsService,
      {
        type: AgentIdentifierType.CHAT,
        agentId: agentConfig.agentId,
      },
      agentConfig,
    );

    await llmService.updateFunctions(functions, agentConfig.agentId!, !!agentConfig.vectorStoreId, agent.canEscalateToHuman);
  }

  async testFunction(functionId: number, params: Record<string, any>): Promise<any> {
    const function_ = await this.functionRepository.findOne({
      where: { id: functionId },
      loadRelationIds: true,
    });

    if (!function_) {
      throw new NotFoundException(`Function ${functionId} not found`);
    }
    try {
      return await this.functionCallService.executeFunctionCall(function_.normalizedName, Number(function_.agente), params, 0);
    } catch (error) {
      let errorObj: unknown;
      try {
        errorObj = JSON.parse(error.message);
      } catch (e) {
        errorObj = error;
      }

      return {
        error: {
          status: (errorObj as { status: number })?.status || 500,
          message: (errorObj as { statusText: string })?.statusText || error,
          complete: error.message ?? error,
        },
      };
    }
  }
}
