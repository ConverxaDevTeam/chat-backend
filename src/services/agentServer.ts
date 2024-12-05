import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentConfig, agentIdentifier, AgentIdentifierType, StartAgentConfig, RunAgentConfig } from 'src/interfaces/agent';
import { SofiaLLMService } from './llm-agent/sofia-llm.service';
import { Agente } from '@models/agent/Agente.entity';
import { Repository } from 'typeorm';
import { Funcion } from '@models/agent/Function.entity';

/*** puede venir con departamento_id o con threat_id uno de los dos es necesario */
interface AgentResponse {
  message: string;
  threadId?: string;
  agentId?: string;
}

/**
 * Funcion que setea la configuracion del agente
 * @param config configuracion del agente
 * @param name nombre del agente
 * @returns configuracion del agente
 */
function setStartAgentConfig(config: Record<string, any>, name: string, funciones: Funcion[]): StartAgentConfig {
  if (!config.instruccion) {
    throw new Error('No se pudo obtener una de las propiedades necesarias del agente: instruccion, agentId, threadId o name');
  }
  return {
    instruccion: config.instruccion,
    name: name,
    funciones: funciones,
  };
}

/**
 * Servicio que se encarga de obtener la respuesta del agente
 */
@Injectable()
export class AgentService {
  /**
   * Constructor del servicio
   * @param agenteRepository repositorio de agentes
   */
  constructor(
    @InjectRepository(Agente)
    private readonly agenteRepository: Repository<Agente>,
    @InjectRepository(Funcion)
    private readonly funcionRepository: Repository<Funcion>,
  ) {}

  /**
   * Obtiene la respuesta del agente
   * @param message mensaje a enviar al agente
   * @param identifier identificador del agente
   * @returns respuesta del agente
   */
  async getAgentResponse(message: string, identifier: agentIdentifier, agentId: number): Promise<AgentResponse> {
    let agenteConfig: AgentConfig | null = null;
    if ([AgentIdentifierType.CHAT, AgentIdentifierType.CHAT_TEST].includes(identifier.type)) {
      const queryBuilder = this.agenteRepository
        .createQueryBuilder('agente')
        .select(['agente.config', 'agente.name'])
        .leftJoin('agente.funciones', 'funciones')
        .addSelect(['funciones.name', 'funciones.description', 'funciones.type', 'funciones.config'])
        .where('agente.id = :agentId', { agentId });

      const result = await queryBuilder.getOne();
      if (!result) throw new Error('No se pudo obtener la configuracion del agente');
      agenteConfig = setStartAgentConfig(result.config, result.name, result.funciones);
    }

    if (identifier.type === AgentIdentifierType.TEST) {
      // Solo obtener las funciones para el caso TEST
      const functions = await this.funcionRepository.createQueryBuilder('funcion').where('funcion.agent_id = :agentId', { agentId }).getMany();

      agenteConfig = {
        agentId: identifier.LLMAgentId, // Usar LLMAgentId que es string
        threadId: identifier.threatId,
        funciones: functions,
      } as RunAgentConfig;
    }

    if (!agenteConfig) {
      throw new Error('No se pudo obtener la configuracion del agente');
    }
    console.log(agenteConfig);
    const llmService = new SofiaLLMService(identifier, agenteConfig);
    await llmService.init();
    const response = await llmService.response(message);
    const responseObj: AgentResponse = { message: response, threadId: llmService.getThreadId() };
    if ([AgentIdentifierType.TEST, AgentIdentifierType.CHAT_TEST].includes(identifier.type)) {
      responseObj.agentId = llmService.getAgentId();
    }
    return responseObj;
  }
}
