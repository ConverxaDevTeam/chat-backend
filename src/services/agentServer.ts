import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentConfig, agentIdentifier } from "src/interfaces/agent";
import { SofiaLLMService } from "./llm-agent/sofia-llm.service";
import { Agente } from "@models/agent/Agente.entity";
import { Repository } from "typeorm";

/*** puede venir con chat_id o con threat_id uno de los dos es necesario */
interface AgentResponse {
  message: string;
  threadId?: string;
}

/**
 * Funcion que setea la configuracion del agente
 * @param config configuracion del agente
 * @param name nombre del agente
 * @returns configuracion del agente
 */
function setAgentConfig(config: Record<string, any>, name: string): AgentConfig {
  if (!config.instruccion) {
    throw new Error("No se pudo obtener la instruccion del agente");
  }
  return {
    instruccion: config.instruccion,
    name: name
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
    private readonly agenteRepository: Repository<Agente>
  ) {}

  /**
   * Obtiene la respuesta del agente
   * @param message mensaje a enviar al agente
   * @param identifier identificador del agente
   * @returns respuesta del agente
   */
  async getAgentResponse(message: string, identifier: agentIdentifier): Promise<AgentResponse> {
    let agenteConfig: AgentConfig | null = null;
    if (identifier.type === "chat") {
      const result = await this.agenteRepository
        .createQueryBuilder('agente')
        .select(['agente.config', 'agente.name'])
        .leftJoin('agente.chat', 'chat')
        .where('chat.id = :chatId', { chatId: identifier.chat_id })
        .getOne();
      
      if (!result) {
        throw new Error("No hay un agente configurado para este chat");
      }
      
      agenteConfig = setAgentConfig(result.config, result.name);
    }

    if (!agenteConfig) {
      throw new Error("No se pudo obtener la configuracion del agente");
    }
    
    const llmService = new SofiaLLMService(identifier, agenteConfig);
    await llmService.init();
    const response = await llmService.response(message);
    return { message: response, threadId: llmService.getThreadId() };
  }
}
