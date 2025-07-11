import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcion } from '@models/agent/Function.entity';
import { FunctionCallService } from '../../modules/agent/function-call.service';
import { AgentManagerService } from '@modules/agent-manager/agent-manager.service';
import { Agente } from '@models/agent/Agente.entity';

@Injectable()
export class FunctionUtilsService {
  constructor(
    @InjectRepository(Funcion)
    private functionRepository: Repository<Funcion>,
    @InjectRepository(Agente)
    private readonly agentRepository: Repository<Agente>,
    private readonly functionCallService: FunctionCallService,
    private readonly agentManagerService: AgentManagerService,
  ) {}

  async updateLLMFunctions(agentId: number): Promise<void> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId },
      relations: ['departamento', 'departamento.organizacion', 'funciones'],
    });
    if (!agent) throw new Error(`No se pudo encontrar el agente con ID ${agentId}`);
    if (!agent.config?.agentId) throw new Error(`No se pudo obtener la configuración del agente ${agentId}`);
    if (!agent.config.instruccion) throw new Error('No se encontró la instrucción del agente');
    if (!agent.departamento?.organizacion?.id) throw new Error('No se pudo obtener la organización');

    const agentConfig = {
      instruccion: agent.config.instruccion as string,
      agentId: agent.config.agentId as string,
      vectorStoreId: agent.config.vectorStoreId,
      organizationId: agent.departamento.organizacion.id,
    };

    await this.agentManagerService.updateFunctions(
      agent.funciones,
      agentConfig.agentId,
      !!agentConfig.vectorStoreId,
      agent.canEscalateToHuman,
      agentConfig.organizationId,
      agent.id,
    );
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
